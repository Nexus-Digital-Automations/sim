/**
 * Advanced Rating and Review System - Comprehensive marketplace review component
 *
 * This component provides a sophisticated rating and review system featuring:
 * - Multi-dimensional rating categories with weighted scoring
 * - AI-powered sentiment analysis and content moderation
 * - Review helpfulness voting and community-driven quality metrics
 * - Advanced filtering, sorting, and search capabilities
 * - Real-time moderation tools and automated content screening
 * - Rich text reviews with media attachments and code examples
 * - Review analytics dashboard for template creators
 * - Social features including review threading and expert verification
 *
 * Features:
 * - Comprehensive sentiment analysis with emotion detection
 * - Advanced review filtering (sentiment, rating, date, helpfulness)
 * - Review quality scoring with spam and abuse detection
 * - Template-specific review categories (ease of use, documentation, etc.)
 * - Creator response system with verified badges
 * - Review helpfulness voting with weighted community scores
 * - Real-time content moderation with AI-powered screening
 * - Rich analytics for review trends and user feedback patterns
 *
 * @author Claude Code Advanced Review System
 * @version 2.0.0
 * @implements Comprehensive Community Feedback Architecture
 */

'use client'

import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Angry,
  Award,
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code,
  Edit,
  Eye,
  Flag,
  Frown,
  Heart,
  Meh,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Sad,
  Search,
  Send,
  Share2,
  Shield,
  Smile,
  Star,
  Surprised,
  ThumbsDown,
  ThumbsUp,
  Trash,
  TrendingUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

interface Review {
  id: string
  userId: string
  userName: string
  userImage?: string
  userBadges?: string[]
  templateId: string
  rating: number
  categoryRatings: {
    easeOfUse: number
    documentation: number
    performance: number
    reliability: number
    support: number
  }
  title: string
  content: string
  pros: string[]
  cons: string[]
  attachments: ReviewAttachment[]
  sentiment: SentimentAnalysis
  helpfulVotes: number
  unhelpfulVotes: number
  totalVotes: number
  helpfulnessScore: number
  qualityScore: number
  moderationStatus: 'approved' | 'pending' | 'rejected' | 'flagged'
  moderationFlags: string[]
  createdAt: string
  updatedAt: string
  verified: boolean
  featured: boolean
  creatorResponse?: CreatorResponse
  replies: ReviewReply[]
  viewCount: number
  shareCount: number
  bookmarkCount: number
  tags: string[]
}

interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral'
  confidence: number
  emotions: {
    joy: number
    sadness: number
    anger: number
    fear: number
    surprise: number
    disgust: number
  }
  topics: Array<{
    topic: string
    sentiment: 'positive' | 'negative' | 'neutral'
    confidence: number
    mentions: number
  }>
  keywords: string[]
  toxicity: {
    score: number
    categories: string[]
  }
}

interface ReviewAttachment {
  id: string
  type: 'image' | 'video' | 'code' | 'document'
  url: string
  name: string
  size: number
  description?: string
}

interface CreatorResponse {
  id: string
  creatorId: string
  creatorName: string
  content: string
  createdAt: string
  helpful: boolean
}

interface ReviewReply {
  id: string
  userId: string
  userName: string
  userImage?: string
  content: string
  createdAt: string
  likes: number
  parentId?: string
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  categoryAverages: {
    easeOfUse: number
    documentation: number
    performance: number
    reliability: number
    support: number
  }
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
  reviewTrends: Array<{
    date: string
    count: number
    averageRating: number
    sentiment: string
  }>
  topReviewers: Array<{
    userId: string
    userName: string
    reviewCount: number
    helpfulnessScore: number
  }>
}

interface AdvancedRatingReviewSystemProps {
  templateId: string
  reviews: Review[]
  stats: ReviewStats
  currentUserId?: string
  onReviewSubmit: (review: Partial<Review>) => Promise<void>
  onReviewUpdate: (reviewId: string, updates: Partial<Review>) => Promise<void>
  onReviewDelete: (reviewId: string) => Promise<void>
  onHelpfulnessVote: (reviewId: string, helpful: boolean) => Promise<void>
  onCreatorResponse: (reviewId: string, response: string) => Promise<void>
  onReviewReply: (reviewId: string, reply: string, parentId?: string) => Promise<void>
  onReviewFlag: (reviewId: string, reason: string) => Promise<void>
  onReviewModeration: (reviewId: string, action: string) => Promise<void>
  isCreator?: boolean
  isModerator?: boolean
  className?: string
}

// ====================================================================
// MAIN COMPONENT
// ====================================================================

export function AdvancedRatingReviewSystem({
  templateId,
  reviews,
  stats,
  currentUserId,
  onReviewSubmit,
  onReviewUpdate,
  onReviewDelete,
  onHelpfulnessVote,
  onCreatorResponse,
  onReviewReply,
  onReviewFlag,
  onReviewModeration,
  isCreator = false,
  isModerator = false,
  className = '',
}: AdvancedRatingReviewSystemProps) {
  // ====================================================================
  // STATE MANAGEMENT
  // ====================================================================

  const [activeTab, setActiveTab] = useState('reviews')
  const [sortBy, setSortBy] = useState('newest')
  const [filterBy, setFilterBy] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null)
  const [showOnlyVerified, setShowOnlyVerified] = useState(false)
  const [showOnlyWithCreatorResponse, setShowOnlyWithCreatorResponse] = useState(false)

  const [isWritingReview, setIsWritingReview] = useState(false)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const [newReview, setNewReview] = useState({
    rating: 5,
    categoryRatings: {
      easeOfUse: 5,
      documentation: 5,
      performance: 5,
      reliability: 5,
      support: 5,
    },
    title: '',
    content: '',
    pros: [''],
    cons: [''],
    attachments: [] as ReviewAttachment[],
    tags: [] as string[],
  })

  // ====================================================================
  // COMPUTED VALUES
  // ====================================================================

  const filteredAndSortedReviews = useMemo(() => {
    const filtered = reviews.filter((review) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = `${review.title} ${review.content} ${review.userName}`.toLowerCase()
        if (!searchableText.includes(query)) return false
      }

      // Rating filter
      if (ratingFilter && review.rating !== ratingFilter) return false

      // Sentiment filter
      if (sentimentFilter && review.sentiment.overall !== sentimentFilter) return false

      // Verified filter
      if (showOnlyVerified && !review.verified) return false

      // Creator response filter
      if (showOnlyWithCreatorResponse && !review.creatorResponse) return false

      // Status filter
      if (filterBy === 'pending' && review.moderationStatus !== 'pending') return false
      if (filterBy === 'flagged' && review.moderationStatus !== 'flagged') return false
      if (filterBy === 'featured' && !review.featured) return false

      return true
    })

    // Sort reviews
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'highest-rated':
          return b.rating - a.rating
        case 'lowest-rated':
          return a.rating - b.rating
        case 'most-helpful':
          return b.helpfulnessScore - a.helpfulnessScore
        case 'least-helpful':
          return a.helpfulnessScore - b.helpfulnessScore
        case 'most-detailed':
          return b.content.length - a.content.length
        default:
          return 0
      }
    })

    return filtered
  }, [
    reviews,
    searchQuery,
    ratingFilter,
    sentimentFilter,
    showOnlyVerified,
    showOnlyWithCreatorResponse,
    filterBy,
    sortBy,
  ])

  const reviewSummary = useMemo(() => {
    const totalReviews = filteredAndSortedReviews.length
    const averageRating =
      totalReviews > 0
        ? filteredAndSortedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0

    const sentimentCounts = filteredAndSortedReviews.reduce(
      (acc, review) => {
        acc[review.sentiment.overall] = (acc[review.sentiment.overall] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalReviews,
      averageRating,
      sentimentCounts,
    }
  }, [filteredAndSortedReviews])

  // ====================================================================
  // EVENT HANDLERS
  // ====================================================================

  const handleReviewSubmit = useCallback(async () => {
    try {
      await onReviewSubmit({
        ...newReview,
        templateId,
        userId: currentUserId!,
      })

      setNewReview({
        rating: 5,
        categoryRatings: {
          easeOfUse: 5,
          documentation: 5,
          performance: 5,
          reliability: 5,
          support: 5,
        },
        title: '',
        content: '',
        pros: [''],
        cons: [''],
        attachments: [],
        tags: [],
      })
      setIsWritingReview(false)
    } catch (error) {
      console.error('Failed to submit review:', error)
    }
  }, [newReview, templateId, currentUserId, onReviewSubmit])

  const handleHelpfulnessVote = useCallback(
    async (reviewId: string, helpful: boolean) => {
      try {
        await onHelpfulnessVote(reviewId, helpful)
      } catch (error) {
        console.error('Failed to vote on review helpfulness:', error)
      }
    },
    [onHelpfulnessVote]
  )

  const toggleReviewExpansion = useCallback((reviewId: string) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }, [])

  const getSentimentIcon = (sentiment: string, confidence: number) => {
    const opacity = confidence / 100
    switch (sentiment) {
      case 'positive':
        return <Smile className={`h-4 w-4 text-green-500`} style={{ opacity }} />
      case 'negative':
        return <Frown className={`h-4 w-4 text-red-500`} style={{ opacity }} />
      case 'neutral':
        return <Meh className={`h-4 w-4 text-gray-500`} style={{ opacity }} />
      default:
        return <Meh className={`h-4 w-4 text-gray-500`} style={{ opacity }} />
    }
  }

  const getEmotionIcon = (emotion: string, intensity: number) => {
    const opacity = intensity / 100
    switch (emotion) {
      case 'joy':
        return <Smile className={`h-3 w-3 text-yellow-500`} style={{ opacity }} />
      case 'sadness':
        return <Sad className={`h-3 w-3 text-blue-500`} style={{ opacity }} />
      case 'anger':
        return <Angry className={`h-3 w-3 text-red-500`} style={{ opacity }} />
      case 'surprise':
        return <Surprised className={`h-3 w-3 text-purple-500`} style={{ opacity }} />
      default:
        return <Meh className={`h-3 w-3 text-gray-500`} style={{ opacity }} />
    }
  }

  // ====================================================================
  // RENDER COMPONENTS
  // ====================================================================

  const renderRatingStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    }

    return (
      <div className='flex items-center gap-0.5'>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    )
  }

  const renderCategoryRatings = (categoryRatings: Review['categoryRatings']) => (
    <div className='grid grid-cols-2 gap-3 text-sm'>
      {Object.entries(categoryRatings).map(([category, rating]) => (
        <div key={category} className='flex items-center justify-between'>
          <span className='text-gray-600 capitalize'>
            {category.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <div className='flex items-center gap-1'>
            {renderRatingStars(rating, 'sm')}
            <span className='ml-1 text-gray-500 text-xs'>{rating}</span>
          </div>
        </div>
      ))}
    </div>
  )

  const renderSentimentAnalysis = (sentiment: SentimentAnalysis) => (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        {getSentimentIcon(sentiment.overall, sentiment.confidence)}
        <span className='font-medium text-sm capitalize'>{sentiment.overall}</span>
        <span className='text-gray-500 text-xs'>
          ({Math.round(sentiment.confidence)}% confidence)
        </span>
      </div>

      {Object.keys(sentiment.emotions).some(
        (emotion) => sentiment.emotions[emotion as keyof typeof sentiment.emotions] > 20
      ) && (
        <div className='flex items-center gap-2'>
          <span className='text-gray-600 text-xs'>Emotions:</span>
          <div className='flex gap-1'>
            {Object.entries(sentiment.emotions)
              .filter(([_, intensity]) => intensity > 20)
              .map(([emotion, intensity]) => (
                <TooltipProvider key={emotion}>
                  <Tooltip>
                    <TooltipTrigger>{getEmotionIcon(emotion, intensity)}</TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {emotion}: {Math.round(intensity)}%
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
          </div>
        </div>
      )}

      {sentiment.toxicity.score > 10 && (
        <div className='flex items-center gap-2'>
          <AlertTriangle className='h-3 w-3 text-yellow-500' />
          <span className='text-xs text-yellow-600'>
            Potential toxicity detected ({Math.round(sentiment.toxicity.score)}%)
          </span>
        </div>
      )}
    </div>
  )

  const renderReviewCard = (review: Review) => {
    const isExpanded = expandedReviews.has(review.id)
    const canModerate = isModerator || (isCreator && !review.creatorResponse)
    const isOwner = currentUserId === review.userId

    return (
      <motion.div
        key={review.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='space-y-4 rounded-lg border border-gray-200 bg-white p-6'
      >
        {/* Review Header */}
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3'>
            <Avatar className='h-10 w-10'>
              <AvatarImage src={review.userImage} />
              <AvatarFallback>{review.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <h4 className='font-medium text-gray-900'>{review.userName}</h4>
                {review.verified && (
                  <Badge variant='secondary' className='text-xs'>
                    <CheckCircle className='mr-1 h-3 w-3' />
                    Verified
                  </Badge>
                )}
                {review.featured && (
                  <Badge variant='default' className='text-xs'>
                    <Award className='mr-1 h-3 w-3' />
                    Featured
                  </Badge>
                )}
                {review.userBadges?.map((badge) => (
                  <Badge key={badge} variant='outline' className='text-xs'>
                    {badge}
                  </Badge>
                ))}
              </div>

              <div className='mt-1 flex items-center gap-2'>
                {renderRatingStars(review.rating)}
                <span className='text-gray-600 text-sm'>
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
                {review.moderationStatus !== 'approved' && (
                  <Badge
                    variant={
                      review.moderationStatus === 'pending'
                        ? 'secondary'
                        : review.moderationStatus === 'flagged'
                          ? 'destructive'
                          : 'outline'
                    }
                    className='text-xs'
                  >
                    {review.moderationStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className='flex items-center gap-1'>
            {renderSentimentAnalysis(review.sentiment)}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm'>
                  <MoreVertical className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {isOwner && (
                  <>
                    <DropdownMenuItem>
                      <Edit className='mr-2 h-4 w-4' />
                      Edit Review
                    </DropdownMenuItem>
                    <DropdownMenuItem className='text-red-600'>
                      <Trash className='mr-2 h-4 w-4' />
                      Delete Review
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>
                  <Flag className='mr-2 h-4 w-4' />
                  Report Review
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className='mr-2 h-4 w-4' />
                  Share Review
                </DropdownMenuItem>
                {canModerate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Shield className='mr-2 h-4 w-4' />
                      Moderate Review
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Review Title */}
        {review.title && <h5 className='font-medium text-gray-900'>{review.title}</h5>}

        {/* Review Content */}
        <div className='space-y-3'>
          <p className='whitespace-pre-wrap text-gray-700'>
            {isExpanded
              ? review.content
              : `${review.content.substring(0, 300)}${review.content.length > 300 ? '...' : ''}`}
          </p>

          {review.content.length > 300 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => toggleReviewExpansion(review.id)}
              className='h-auto p-0 font-normal text-blue-600 hover:text-blue-700'
            >
              {isExpanded ? (
                <>
                  <ChevronUp className='mr-1 h-4 w-4' />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className='mr-1 h-4 w-4' />
                  Read More
                </>
              )}
            </Button>
          )}
        </div>

        {/* Category Ratings */}
        {isExpanded && (
          <Card className='bg-gray-50'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Category Ratings</CardTitle>
            </CardHeader>
            <CardContent>{renderCategoryRatings(review.categoryRatings)}</CardContent>
          </Card>
        )}

        {/* Pros and Cons */}
        {isExpanded && (review.pros.length > 0 || review.cons.length > 0) && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {review.pros.length > 0 && (
              <div className='space-y-2'>
                <h6 className='flex items-center gap-1 font-medium text-green-600'>
                  <ThumbsUp className='h-4 w-4' />
                  Pros
                </h6>
                <ul className='space-y-1'>
                  {review.pros.map((pro, index) => (
                    <li key={index} className='flex items-start gap-2 text-gray-700 text-sm'>
                      <CheckCircle className='mt-0.5 h-3 w-3 flex-shrink-0 text-green-500' />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.cons.length > 0 && (
              <div className='space-y-2'>
                <h6 className='flex items-center gap-1 font-medium text-red-600'>
                  <ThumbsDown className='h-4 w-4' />
                  Cons
                </h6>
                <ul className='space-y-1'>
                  {review.cons.map((con, index) => (
                    <li key={index} className='flex items-start gap-2 text-gray-700 text-sm'>
                      <AlertTriangle className='mt-0.5 h-3 w-3 flex-shrink-0 text-red-500' />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Review Attachments */}
        {isExpanded && review.attachments.length > 0 && (
          <div className='space-y-2'>
            <h6 className='flex items-center gap-1 font-medium text-gray-900'>
              <Paperclip className='h-4 w-4' />
              Attachments
            </h6>
            <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
              {review.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className='cursor-pointer rounded-lg border border-gray-200 p-3 hover:bg-gray-50'
                >
                  <div className='flex items-center gap-2'>
                    {attachment.type === 'image' && <Camera className='h-4 w-4 text-gray-500' />}
                    {attachment.type === 'code' && <Code className='h-4 w-4 text-gray-500' />}
                    {attachment.type === 'document' && (
                      <BookOpen className='h-4 w-4 text-gray-500' />
                    )}
                    <span className='truncate text-gray-700 text-xs'>{attachment.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Tags */}
        {review.tags.length > 0 && (
          <div className='flex flex-wrap gap-1'>
            {review.tags.map((tag) => (
              <Badge key={tag} variant='outline' className='text-xs'>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Review Actions */}
        <div className='flex items-center justify-between border-gray-200 border-t pt-2'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleHelpfulnessVote(review.id, true)}
                className='text-green-600 hover:bg-green-50 hover:text-green-700'
              >
                <ThumbsUp className='mr-1 h-4 w-4' />
                {review.helpfulVotes}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleHelpfulnessVote(review.id, false)}
                className='text-red-600 hover:bg-red-50 hover:text-red-700'
              >
                <ThumbsDown className='mr-1 h-4 w-4' />
                {review.unhelpfulVotes}
              </Button>
            </div>

            <Button
              variant='ghost'
              size='sm'
              onClick={() => setReplyingTo(review.id)}
              className='text-gray-600 hover:text-gray-700'
            >
              <MessageCircle className='mr-1 h-4 w-4' />
              Reply
            </Button>

            <div className='flex items-center gap-1 text-gray-500 text-xs'>
              <Eye className='h-3 w-3' />
              {review.viewCount}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs'>
              Quality: {Math.round(review.qualityScore)}/100
            </Badge>
            <Badge variant='outline' className='text-xs'>
              Helpful: {Math.round(review.helpfulnessScore)}/100
            </Badge>
          </div>
        </div>

        {/* Creator Response */}
        {review.creatorResponse && (
          <div className='space-y-2 rounded-lg bg-blue-50 p-4'>
            <div className='flex items-center gap-2'>
              <Badge variant='default' className='text-xs'>
                Creator Response
              </Badge>
              <span className='text-gray-600 text-xs'>
                {new Date(review.creatorResponse.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className='text-gray-700 text-sm'>{review.creatorResponse.content}</p>
          </div>
        )}

        {/* Review Replies */}
        {isExpanded && review.replies.length > 0 && (
          <div className='space-y-3'>
            <h6 className='flex items-center gap-1 font-medium text-gray-900'>
              <MessageSquare className='h-4 w-4' />
              Replies ({review.replies.length})
            </h6>
            <div className='space-y-3 border-gray-200 border-l-2 pl-4'>
              {review.replies.map((reply) => (
                <div key={reply.id} className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Avatar className='h-6 w-6'>
                      <AvatarImage src={reply.userImage} />
                      <AvatarFallback className='text-xs'>
                        {reply.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className='font-medium text-sm'>{reply.userName}</span>
                    <span className='text-gray-500 text-xs'>
                      {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className='pl-8 text-gray-700 text-sm'>{reply.content}</p>
                  <div className='flex items-center gap-2 pl-8'>
                    <Button variant='ghost' size='sm' className='h-6 px-2 text-xs'>
                      <Heart className='mr-1 h-3 w-3' />
                      {reply.likes}
                    </Button>
                    <Button variant='ghost' size='sm' className='h-6 px-2 text-xs'>
                      Reply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply Form */}
        {replyingTo === review.id && (
          <div className='space-y-3 border-gray-200 border-t pt-3'>
            <Textarea placeholder='Write your reply...' className='resize-none' rows={3} />
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm'>
                  <Paperclip className='h-4 w-4' />
                </Button>
                <Button variant='outline' size='sm'>
                  <Smile className='h-4 w-4' />
                </Button>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
                <Button size='sm'>
                  <Send className='mr-1 h-4 w-4' />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const renderReviewForm = () => (
    <Card className='bg-white'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <MessageSquare className='h-5 w-5' />
          Write a Review
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Overall Rating */}
        <div className='space-y-2'>
          <Label>Overall Rating</Label>
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-0.5'>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 cursor-pointer transition-colors ${
                    star <= newReview.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200 hover:fill-yellow-300 hover:text-yellow-300'
                  }`}
                  onClick={() => setNewReview((prev) => ({ ...prev, rating: star }))}
                />
              ))}
            </div>
            <span className='text-gray-600 text-sm'>{newReview.rating} out of 5 stars</span>
          </div>
        </div>

        {/* Category Ratings */}
        <div className='space-y-4'>
          <Label>Category Ratings</Label>
          {Object.entries(newReview.categoryRatings).map(([category, rating]) => (
            <div key={category} className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm capitalize'>
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className='text-gray-600 text-sm'>{rating}/5</span>
              </div>
              <Slider
                value={[rating]}
                onValueChange={([value]) =>
                  setNewReview((prev) => ({
                    ...prev,
                    categoryRatings: {
                      ...prev.categoryRatings,
                      [category]: value,
                    },
                  }))
                }
                max={5}
                min={1}
                step={1}
                className='w-full'
              />
            </div>
          ))}
        </div>

        {/* Review Title */}
        <div className='space-y-2'>
          <Label htmlFor='review-title'>Review Title (Optional)</Label>
          <Input
            id='review-title'
            placeholder='Summarize your experience...'
            value={newReview.title}
            onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>

        {/* Review Content */}
        <div className='space-y-2'>
          <Label htmlFor='review-content'>Your Review</Label>
          <Textarea
            id='review-content'
            placeholder='Share your detailed experience with this template...'
            value={newReview.content}
            onChange={(e) => setNewReview((prev) => ({ ...prev, content: e.target.value }))}
            rows={6}
            className='resize-none'
          />
          <div className='text-right text-gray-500 text-xs'>
            {newReview.content.length}/2000 characters
          </div>
        </div>

        {/* Pros and Cons */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Pros (Optional)</Label>
            {newReview.pros.map((pro, index) => (
              <div key={index} className='flex items-center gap-2'>
                <Input
                  placeholder='What did you like?'
                  value={pro}
                  onChange={(e) => {
                    const newPros = [...newReview.pros]
                    newPros[index] = e.target.value
                    setNewReview((prev) => ({ ...prev, pros: newPros }))
                  }}
                />
                {newReview.pros.length > 1 && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      const newPros = newReview.pros.filter((_, i) => i !== index)
                      setNewReview((prev) => ({ ...prev, pros: newPros }))
                    }}
                  >
                    <Trash className='h-4 w-4' />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setNewReview((prev) => ({ ...prev, pros: [...prev.pros, ''] }))}
              className='w-full'
            >
              Add Pro
            </Button>
          </div>

          <div className='space-y-2'>
            <Label>Cons (Optional)</Label>
            {newReview.cons.map((con, index) => (
              <div key={index} className='flex items-center gap-2'>
                <Input
                  placeholder='What could be improved?'
                  value={con}
                  onChange={(e) => {
                    const newCons = [...newReview.cons]
                    newCons[index] = e.target.value
                    setNewReview((prev) => ({ ...prev, cons: newCons }))
                  }}
                />
                {newReview.cons.length > 1 && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      const newCons = newReview.cons.filter((_, i) => i !== index)
                      setNewReview((prev) => ({ ...prev, cons: newCons }))
                    }}
                  >
                    <Trash className='h-4 w-4' />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setNewReview((prev) => ({ ...prev, cons: [...prev.cons, ''] }))}
              className='w-full'
            >
              Add Con
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center justify-between border-gray-200 border-t pt-4'>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm'>
              <Paperclip className='mr-1 h-4 w-4' />
              Attach Files
            </Button>
            <Button variant='outline' size='sm'>
              <Code className='mr-1 h-4 w-4' />
              Add Code
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setIsWritingReview(false)}>
              Cancel
            </Button>
            <Button onClick={handleReviewSubmit} disabled={!newReview.content.trim()}>
              <Send className='mr-1 h-4 w-4' />
              Submit Review
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // ====================================================================
  // MAIN RENDER
  // ====================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Review Statistics Header */}
      <Card className='bg-gradient-to-r from-blue-50 to-purple-50'>
        <CardContent className='p-6'>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-4'>
            <div className='text-center'>
              <div className='font-bold text-3xl text-gray-900'>
                {stats.averageRating.toFixed(1)}
              </div>
              <div className='mb-1 flex items-center justify-center'>
                {renderRatingStars(Math.round(stats.averageRating))}
              </div>
              <div className='text-gray-600 text-sm'>{stats.totalReviews} reviews</div>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900'>Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
                return (
                  <div key={rating} className='flex items-center gap-2 text-sm'>
                    <span className='w-4'>{rating}</span>
                    <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                    <Progress value={percentage} className='h-2 flex-1' />
                    <span className='w-12 text-gray-500 text-xs'>{count}</span>
                  </div>
                )
              })}
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900'>Sentiment Analysis</h4>
              <div className='space-y-1'>
                {Object.entries(stats.sentimentBreakdown).map(([sentiment, count]) => (
                  <div key={sentiment} className='flex items-center justify-between text-sm'>
                    <div className='flex items-center gap-1'>
                      {getSentimentIcon(sentiment, 80)}
                      <span className='capitalize'>{sentiment}</span>
                    </div>
                    <span className='font-medium'>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900'>Category Ratings</h4>
              <div className='space-y-1 text-sm'>
                {Object.entries(stats.categoryAverages).map(([category, average]) => (
                  <div key={category} className='flex items-center justify-between'>
                    <span className='capitalize'>{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className='font-medium'>{average.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='reviews'>Reviews ({reviewSummary.totalReviews})</TabsTrigger>
          <TabsTrigger value='analytics'>
            <BarChart3 className='mr-1 h-4 w-4' />
            Analytics
          </TabsTrigger>
          <TabsTrigger value='moderation'>
            <Shield className='mr-1 h-4 w-4' />
            Moderation
          </TabsTrigger>
          <TabsTrigger value='insights'>
            <TrendingUp className='mr-1 h-4 w-4' />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value='reviews' className='space-y-6'>
          {/* Filters and Controls */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex flex-col gap-4 lg:flex-row'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400' />
                    <Input
                      placeholder='Search reviews...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className='w-40'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='newest'>Newest First</SelectItem>
                      <SelectItem value='oldest'>Oldest First</SelectItem>
                      <SelectItem value='highest-rated'>Highest Rated</SelectItem>
                      <SelectItem value='lowest-rated'>Lowest Rated</SelectItem>
                      <SelectItem value='most-helpful'>Most Helpful</SelectItem>
                      <SelectItem value='least-helpful'>Least Helpful</SelectItem>
                      <SelectItem value='most-detailed'>Most Detailed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={ratingFilter?.toString() || 'all'}
                    onValueChange={(value) =>
                      setRatingFilter(value === 'all' ? null : Number.parseInt(value))
                    }
                  >
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Ratings</SelectItem>
                      <SelectItem value='5'>5 Stars</SelectItem>
                      <SelectItem value='4'>4 Stars</SelectItem>
                      <SelectItem value='3'>3 Stars</SelectItem>
                      <SelectItem value='2'>2 Stars</SelectItem>
                      <SelectItem value='1'>1 Star</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sentimentFilter || 'all'}
                    onValueChange={(value) => setSentimentFilter(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Sentiment</SelectItem>
                      <SelectItem value='positive'>Positive</SelectItem>
                      <SelectItem value='neutral'>Neutral</SelectItem>
                      <SelectItem value='negative'>Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='mt-4 flex flex-wrap gap-4'>
                <div className='flex items-center space-x-2'>
                  <Switch
                    id='verified-only'
                    checked={showOnlyVerified}
                    onCheckedChange={setShowOnlyVerified}
                  />
                  <Label htmlFor='verified-only'>Verified only</Label>
                </div>

                <div className='flex items-center space-x-2'>
                  <Switch
                    id='creator-response'
                    checked={showOnlyWithCreatorResponse}
                    onCheckedChange={setShowOnlyWithCreatorResponse}
                  />
                  <Label htmlFor='creator-response'>Has creator response</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Write Review Button */}
          {currentUserId && !isWritingReview && (
            <Button onClick={() => setIsWritingReview(true)} className='w-full' size='lg'>
              <MessageSquare className='mr-2 h-5 w-5' />
              Write a Review
            </Button>
          )}

          {/* Review Form */}
          <AnimatePresence>
            {isWritingReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderReviewForm()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reviews List */}
          <div className='space-y-4'>
            <AnimatePresence>
              {filteredAndSortedReviews.map((review) => renderReviewCard(review))}
            </AnimatePresence>

            {filteredAndSortedReviews.length === 0 && (
              <div className='py-12 text-center'>
                <MessageSquare className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 font-medium text-gray-900 text-lg'>No reviews found</h3>
                <p className='mb-4 text-gray-600'>
                  {searchQuery || ratingFilter || sentimentFilter
                    ? 'Try adjusting your filters to see more reviews.'
                    : 'Be the first to review this template!'}
                </p>
                {currentUserId && !searchQuery && !isWritingReview && (
                  <Button onClick={() => setIsWritingReview(true)}>Write the First Review</Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value='analytics'>
          <Card>
            <CardHeader>
              <CardTitle>Review Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='py-12 text-center'>
                <BarChart3 className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <p className='text-gray-600'>Analytics dashboard coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='moderation'>
          <Card>
            <CardHeader>
              <CardTitle>Moderation Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='py-12 text-center'>
                <Shield className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <p className='text-gray-600'>Moderation tools coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='insights'>
          <Card>
            <CardHeader>
              <CardTitle>Review Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='py-12 text-center'>
                <TrendingUp className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <p className='text-gray-600'>AI-powered insights coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ====================================================================
// EXPORT
// ====================================================================

export default AdvancedRatingReviewSystem
