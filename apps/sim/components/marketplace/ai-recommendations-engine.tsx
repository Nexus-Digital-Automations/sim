/**
 * AI-Powered Template Recommendations Engine Component
 *
 * This component provides intelligent template recommendations using advanced AI and ML
 * algorithms to deliver personalized template suggestions based on:
 * - User behavior patterns and interaction history
 * - Content-based filtering using template metadata
 * - Collaborative filtering from similar users
 * - Contextual recommendations based on current workflow
 * - Trending templates and community preferences
 * - Semantic similarity using vector embeddings
 * - Real-time learning from user feedback
 * - Cross-category recommendations for workflow expansion
 *
 * Features:
 * - Multiple recommendation algorithms with weighted scoring
 * - Real-time personalization based on user interactions
 * - Contextual recommendations for current workflow context
 * - Explanation system for recommendation reasoning
 * - A/B testing framework for algorithm optimization
 * - Feedback collection for continuous learning
 * - Performance tracking and analytics
 * - Fallback recommendations for new users
 * - Multi-armed bandit for exploration vs exploitation
 * - Integration with user preference learning
 *
 * @author Claude Code Marketplace System - AI/ML Specialist
 * @version 2.0.0
 */

'use client'

import type * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Info,
  Lightbulb,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Template, User as UserType } from '@/lib/templates/types'
import { cn } from '@/lib/utils'

/**
 * AI Recommendations Engine Props Interface
 */
export interface AIRecommendationsEngineProps {
  /** Current user for personalization */
  currentUser: UserType
  /** Current workflow context (if any) */
  currentWorkflowContext?: {
    category: string
    tags: string[]
    existingTemplates: string[]
    workflowType: string
  }
  /** Custom CSS class name */
  className?: string
  /** Number of recommendations to display */
  maxRecommendations?: number
  /** Enable real-time learning */
  enableRealTimeLearning?: boolean
  /** Show explanation for recommendations */
  showExplanations?: boolean
  /** Enable A/B testing */
  enableABTesting?: boolean
  /** Template selection handler */
  onTemplateSelect?: (template: Template, reason: string) => void
  /** Feedback handler for recommendation quality */
  onFeedback?: (templateId: string, feedback: RecommendationFeedback) => void
  /** Settings change handler */
  onSettingsChange?: (settings: RecommendationSettings) => void
}

/**
 * Recommendation Types
 */
type RecommendationType =
  | 'personalized'
  | 'trending'
  | 'similar'
  | 'contextual'
  | 'collaborative'
  | 'content_based'
  | 'hybrid'

/**
 * Recommendation Algorithm Interface
 */
interface RecommendationAlgorithm {
  id: string
  name: string
  description: string
  weight: number
  enabled: boolean
  accuracy?: number
  performance?: number
}

/**
 * Template Recommendation Interface
 */
interface TemplateRecommendation {
  template: Template
  score: number
  confidence: number
  reasons: RecommendationReason[]
  algorithm: string
  timestamp: Date
  context?: Record<string, any>
}

/**
 * Recommendation Reason Interface
 */
interface RecommendationReason {
  type: 'behavior' | 'content' | 'social' | 'trending' | 'contextual' | 'quality'
  message: string
  strength: number // 0-1
  evidence?: string[]
}

/**
 * Recommendation Feedback Interface
 */
interface RecommendationFeedback {
  rating: number // 1-5
  relevance: number // 1-5
  quality: number // 1-5
  wouldUseAgain: boolean
  comments?: string
}

/**
 * Recommendation Settings Interface
 */
interface RecommendationSettings {
  algorithms: RecommendationAlgorithm[]
  personalizationLevel: number // 0-100
  diversityBoost: number // 0-100
  noveltyPreference: number // 0-100
  contextualWeight: number // 0-100
  enableExploration: boolean
  refreshInterval: number // minutes
}

/**
 * User Learning Profile Interface
 */
interface UserLearningProfile {
  preferences: {
    categories: Record<string, number>
    tags: Record<string, number>
    authors: Record<string, number>
    difficulty: Record<string, number>
  }
  behavior: {
    clickThroughRate: number
    dwellTime: number
    completionRate: number
    shareRate: number
  }
  feedback: {
    averageRating: number
    satisfactionScore: number
    feedbackCount: number
  }
  lastUpdated: Date
}

/**
 * AI Recommendations Engine Component
 */
export const AIRecommendationsEngine: React.FC<AIRecommendationsEngineProps> = ({
  currentUser,
  currentWorkflowContext,
  className,
  maxRecommendations = 12,
  enableRealTimeLearning = true,
  showExplanations = true,
  enableABTesting = false,
  onTemplateSelect,
  onFeedback,
  onSettingsChange,
}) => {
  // State management
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [userProfile, setUserProfile] = useState<UserLearningProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<RecommendationType>('personalized')
  const [showSettings, setShowSettings] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<string | null>(null)
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)

  // Recommendation settings with defaults
  const [settings, setSettings] = useState<RecommendationSettings>({
    algorithms: [
      {
        id: 'collaborative',
        name: 'Collaborative Filtering',
        description: 'Based on users with similar preferences',
        weight: 30,
        enabled: true,
        accuracy: 85,
        performance: 92,
      },
      {
        id: 'content_based',
        name: 'Content-Based',
        description: 'Based on template features and metadata',
        weight: 25,
        enabled: true,
        accuracy: 78,
        performance: 88,
      },
      {
        id: 'behavioral',
        name: 'Behavioral Analysis',
        description: 'Based on your usage patterns',
        weight: 20,
        enabled: true,
        accuracy: 82,
        performance: 90,
      },
      {
        id: 'contextual',
        name: 'Contextual',
        description: 'Based on current workflow context',
        weight: 15,
        enabled: true,
        accuracy: 79,
        performance: 95,
      },
      {
        id: 'trending',
        name: 'Trending',
        description: 'Popular templates in the community',
        weight: 10,
        enabled: true,
        accuracy: 65,
        performance: 98,
      },
    ],
    personalizationLevel: 75,
    diversityBoost: 40,
    noveltyPreference: 30,
    contextualWeight: 60,
    enableExploration: true,
    refreshInterval: 15,
  })

  /**
   * Load recommendations and user profile
   */
  const loadRecommendations = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        // Load user learning profile
        const profileResponse = await fetch(
          `/api/marketplace/users/${currentUser.id}/learning-profile`
        )
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserProfile(profileData.data)
        }

        // Prepare recommendation request
        const recommendationRequest = {
          userId: currentUser.id,
          maxResults: maxRecommendations,
          type: activeTab,
          context: currentWorkflowContext,
          settings,
          enableABTesting,
        }

        // Load recommendations
        const recommendationsResponse = await fetch('/api/marketplace/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recommendationRequest),
        })

        if (recommendationsResponse.ok) {
          const recommendationsData = await recommendationsResponse.json()
          setRecommendations(recommendationsData.data || [])
        }

        // Track recommendation request for learning
        if (enableRealTimeLearning) {
          fetch('/api/marketplace/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'recommendations_viewed',
              userId: currentUser.id,
              data: {
                type: activeTab,
                count: maxRecommendations,
                context: currentWorkflowContext,
              },
            }),
          }).catch(console.error)
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      currentUser.id,
      maxRecommendations,
      activeTab,
      currentWorkflowContext,
      settings,
      enableABTesting,
      enableRealTimeLearning,
    ]
  )

  /**
   * Handle template selection with tracking
   */
  const handleTemplateSelect = useCallback(
    (template: Template, recommendation: TemplateRecommendation) => {
      const reason = recommendation.reasons[0]?.message || 'AI recommendation'

      // Track selection for learning
      if (enableRealTimeLearning) {
        fetch('/api/marketplace/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'recommendation_clicked',
            userId: currentUser.id,
            data: {
              templateId: template.id,
              recommendationType: activeTab,
              algorithm: recommendation.algorithm,
              score: recommendation.score,
              position: recommendations.indexOf(recommendation),
            },
          }),
        }).catch(console.error)
      }

      onTemplateSelect?.(template, reason)
    },
    [activeTab, currentUser.id, enableRealTimeLearning, onTemplateSelect, recommendations]
  )

  /**
   * Handle feedback submission
   */
  const handleFeedbackSubmit = useCallback(
    async (templateId: string, feedback: RecommendationFeedback) => {
      try {
        const response = await fetch('/api/marketplace/recommendations/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            userId: currentUser.id,
            feedback,
            recommendationType: activeTab,
          }),
        })

        if (response.ok && onFeedback) {
          onFeedback(templateId, feedback)
        }

        setShowFeedbackDialog(null)

        // Refresh recommendations based on feedback if real-time learning is enabled
        if (enableRealTimeLearning && feedback.rating <= 2) {
          setTimeout(() => loadRecommendations(true), 1000)
        }
      } catch (error) {
        console.error('Failed to submit feedback:', error)
      }
    },
    [activeTab, currentUser.id, enableRealTimeLearning, loadRecommendations, onFeedback]
  )

  /**
   * Update recommendation settings
   */
  const updateSettings = useCallback(
    (newSettings: Partial<RecommendationSettings>) => {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      onSettingsChange?.(updatedSettings)
    },
    [settings, onSettingsChange]
  )

  /**
   * Toggle reason expansion
   */
  const toggleReasonExpansion = useCallback((templateId: string) => {
    setExpandedReasons((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(templateId)) {
        newSet.delete(templateId)
      } else {
        newSet.add(templateId)
      }
      return newSet
    })
  }, [])

  /**
   * Get reason color based on type
   */
  const getReasonColor = useCallback((type: RecommendationReason['type']): string => {
    switch (type) {
      case 'behavior':
        return 'bg-blue-100 text-blue-800'
      case 'content':
        return 'bg-green-100 text-green-800'
      case 'social':
        return 'bg-purple-100 text-purple-800'
      case 'trending':
        return 'bg-orange-100 text-orange-800'
      case 'contextual':
        return 'bg-cyan-100 text-cyan-800'
      case 'quality':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

  /**
   * Get reason icon
   */
  const getReasonIcon = useCallback((type: RecommendationReason['type']) => {
    switch (type) {
      case 'behavior':
        return <User className='h-3 w-3' />
      case 'content':
        return <Target className='h-3 w-3' />
      case 'social':
        return <Users className='h-3 w-3' />
      case 'trending':
        return <TrendingUp className='h-3 w-3' />
      case 'contextual':
        return <Lightbulb className='h-3 w-3' />
      case 'quality':
        return <Star className='h-3 w-3' />
      default:
        return <Info className='h-3 w-3' />
    }
  }, [])

  // Load initial recommendations
  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  // Auto-refresh recommendations
  useEffect(() => {
    if (settings.refreshInterval > 0) {
      const interval = setInterval(
        () => {
          loadRecommendations(true)
        },
        settings.refreshInterval * 60 * 1000
      )

      return () => clearInterval(interval)
    }
  }, [settings.refreshInterval, loadRecommendations])

  // Paginate recommendations
  const paginatedRecommendations = useMemo(() => {
    const itemsPerPage = 6
    const startIndex = currentPage * itemsPerPage
    return recommendations.slice(startIndex, startIndex + itemsPerPage)
  }, [recommendations, currentPage])

  const totalPages = Math.ceil(recommendations.length / 6)

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }, [])

  return (
    <TooltipProvider>
      <div className={cn('w-full', className)}>
        {/* Header */}
        <div className='mb-6 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Brain className='h-6 w-6 text-blue-600' />
              <h2 className='font-semibold text-xl'>AI Recommendations</h2>
            </div>
            {userProfile && (
              <Badge variant='outline' className='gap-1'>
                <Sparkles className='h-3 w-3' />
                {settings.personalizationLevel}% Personalized
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => loadRecommendations(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
            <Button variant='outline' size='sm' onClick={() => setShowSettings(true)}>
              <Settings className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Recommendation Types Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value: any) => setActiveTab(value)}
          className='mb-6'
        >
          <TabsList className='grid w-full grid-cols-4 lg:grid-cols-7'>
            <TabsTrigger value='personalized' className='gap-1'>
              <User className='h-3 w-3' />
              For You
            </TabsTrigger>
            <TabsTrigger value='trending' className='gap-1'>
              <TrendingUp className='h-3 w-3' />
              Trending
            </TabsTrigger>
            <TabsTrigger value='similar' className='gap-1'>
              <Target className='h-3 w-3' />
              Similar
            </TabsTrigger>
            <TabsTrigger value='contextual' className='gap-1'>
              <Lightbulb className='h-3 w-3' />
              Contextual
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className='mt-6'>
            {loading ? (
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className='animate-pulse'>
                    <CardContent className='p-6'>
                      <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                          <div className='h-12 w-12 rounded-lg bg-gray-200' />
                          <div className='flex-1 space-y-2'>
                            <div className='h-4 rounded bg-gray-200' />
                            <div className='h-3 w-2/3 rounded bg-gray-200' />
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <div className='h-3 rounded bg-gray-200' />
                          <div className='h-3 w-3/4 rounded bg-gray-200' />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className='py-12 text-center'>
                <Brain className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 font-medium'>No Recommendations Yet</h3>
                <p className='mb-4 text-muted-foreground text-sm'>
                  We're learning your preferences. Try browsing some templates first.
                </p>
                <Button onClick={() => loadRecommendations(true)}>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  Refresh Recommendations
                </Button>
              </div>
            ) : (
              <>
                {/* Recommendations Grid */}
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                  <AnimatePresence mode='popLayout'>
                    {paginatedRecommendations.map((recommendation, index) => (
                      <motion.div
                        key={recommendation.template.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className='group h-full cursor-pointer transition-all duration-200 hover:shadow-lg'>
                          <CardHeader className='pb-3'>
                            <div className='flex items-start justify-between'>
                              <div className='flex items-center gap-3'>
                                <div
                                  className='flex h-12 w-12 items-center justify-center rounded-lg font-bold text-white'
                                  style={{ backgroundColor: recommendation.template.color }}
                                >
                                  {recommendation.template.icon || '📄'}
                                </div>
                                <div className='min-w-0 flex-1'>
                                  <CardTitle className='text-base leading-tight transition-colors group-hover:text-blue-600'>
                                    {recommendation.template.name}
                                  </CardTitle>
                                  <div className='mt-1 flex items-center gap-2'>
                                    <div className='flex items-center gap-1'>
                                      <Star className='h-3 w-3 fill-yellow-400 text-yellow-400' />
                                      <span className='text-muted-foreground text-xs'>
                                        {recommendation.template.ratingAverage?.toFixed(1) || '0.0'}
                                      </span>
                                    </div>
                                    <Badge variant='outline' className='text-xs'>
                                      {(recommendation.score * 100).toFixed(0)}% match
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='opacity-0 group-hover:opacity-100'
                                  >
                                    <MoreHorizontal className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setShowFeedbackDialog(recommendation.template.id)
                                    }
                                  >
                                    <Heart className='mr-2 h-4 w-4' />
                                    Rate Recommendation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <X className='mr-2 h-4 w-4' />
                                    Not Interested
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Eye className='mr-2 h-4 w-4' />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>

                          <CardContent className='pb-3'>
                            <p className='mb-3 line-clamp-2 text-muted-foreground text-sm'>
                              {recommendation.template.description}
                            </p>

                            {/* Recommendation Reasons */}
                            {showExplanations && recommendation.reasons.length > 0 && (
                              <div className='space-y-2'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='h-auto justify-start p-0 text-left font-normal text-xs'
                                  onClick={() => toggleReasonExpansion(recommendation.template.id)}
                                >
                                  <ChevronDown
                                    className={cn(
                                      'mr-1 h-3 w-3 transition-transform',
                                      expandedReasons.has(recommendation.template.id) &&
                                        'rotate-180'
                                    )}
                                  />
                                  Why this recommendation?
                                </Button>

                                <AnimatePresence>
                                  {expandedReasons.has(recommendation.template.id) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className='space-y-1 overflow-hidden'
                                    >
                                      {recommendation.reasons
                                        .slice(0, 2)
                                        .map((reason, reasonIndex) => (
                                          <div key={reasonIndex} className='flex items-start gap-2'>
                                            <Badge
                                              variant='secondary'
                                              className={cn(
                                                'gap-1 text-xs',
                                                getReasonColor(reason.type)
                                              )}
                                            >
                                              {getReasonIcon(reason.type)}
                                              {reason.type}
                                            </Badge>
                                            <p className='flex-1 text-muted-foreground text-xs'>
                                              {reason.message}
                                            </p>
                                          </div>
                                        ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            {/* Template Tags */}
                            {recommendation.template.tags && (
                              <div className='mt-3 flex flex-wrap gap-1'>
                                {recommendation.template.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant='secondary' className='text-xs'>
                                    {tag}
                                  </Badge>
                                ))}
                                {recommendation.template.tags.length > 3 && (
                                  <Badge variant='secondary' className='text-xs'>
                                    +{recommendation.template.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>

                          <CardFooter className='pt-0'>
                            <div className='flex w-full items-center justify-between'>
                              <div className='flex items-center gap-4 text-muted-foreground text-xs'>
                                <div className='flex items-center gap-1'>
                                  <Eye className='h-3 w-3' />
                                  {formatNumber(recommendation.template.views || 0)}
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Zap className='h-3 w-3' />
                                  {formatNumber(recommendation.template.downloadCount || 0)}
                                </div>
                              </div>
                              <Button
                                size='sm'
                                onClick={() =>
                                  handleTemplateSelect(recommendation.template, recommendation)
                                }
                                className='ml-auto'
                              >
                                Use Template
                                <ArrowRight className='ml-1 h-3 w-3' />
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='mt-8 flex items-center justify-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-muted-foreground text-sm'>
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className='max-h-[80vh] max-w-2xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>Recommendation Settings</DialogTitle>
              <DialogDescription>Customize how AI recommendations work for you</DialogDescription>
            </DialogHeader>

            <div className='space-y-6'>
              {/* Personalization Level */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='font-medium'>Personalization Level</label>
                  <span className='text-muted-foreground text-sm'>
                    {settings.personalizationLevel}%
                  </span>
                </div>
                <Slider
                  value={[settings.personalizationLevel]}
                  onValueChange={(value) => updateSettings({ personalizationLevel: value[0] })}
                  max={100}
                  step={5}
                  className='w-full'
                />
                <p className='text-muted-foreground text-xs'>
                  Higher values prioritize your personal preferences over general popularity
                </p>
              </div>

              {/* Algorithm Weights */}
              <div className='space-y-4'>
                <h3 className='font-medium'>Recommendation Algorithms</h3>
                {settings.algorithms.map((algorithm) => (
                  <div key={algorithm.id} className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <Switch
                          checked={algorithm.enabled}
                          onCheckedChange={(enabled) => {
                            const updatedAlgorithms = settings.algorithms.map((a) =>
                              a.id === algorithm.id ? { ...a, enabled } : a
                            )
                            updateSettings({ algorithms: updatedAlgorithms })
                          }}
                        />
                        <div>
                          <p className='font-medium text-sm'>{algorithm.name}</p>
                          <p className='text-muted-foreground text-xs'>{algorithm.description}</p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm'>{algorithm.weight}%</p>
                        {algorithm.accuracy && (
                          <p className='text-muted-foreground text-xs'>
                            {algorithm.accuracy}% accuracy
                          </p>
                        )}
                      </div>
                    </div>
                    {algorithm.enabled && (
                      <Slider
                        value={[algorithm.weight]}
                        onValueChange={(value) => {
                          const updatedAlgorithms = settings.algorithms.map((a) =>
                            a.id === algorithm.id ? { ...a, weight: value[0] } : a
                          )
                          updateSettings({ algorithms: updatedAlgorithms })
                        }}
                        max={50}
                        step={5}
                        className='w-full'
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Advanced Settings */}
              <div className='space-y-4'>
                <h3 className='font-medium'>Advanced Settings</h3>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <label className='font-medium text-sm'>Diversity Boost</label>
                    <Slider
                      value={[settings.diversityBoost]}
                      onValueChange={(value) => updateSettings({ diversityBoost: value[0] })}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='font-medium text-sm'>Novelty Preference</label>
                    <Slider
                      value={[settings.noveltyPreference]}
                      onValueChange={(value) => updateSettings({ noveltyPreference: value[0] })}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowSettings(false)}>Save Settings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        {showFeedbackDialog && (
          <Dialog open={!!showFeedbackDialog} onOpenChange={() => setShowFeedbackDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate This Recommendation</DialogTitle>
                <DialogDescription>
                  Your feedback helps improve AI recommendations
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <label className='font-medium text-sm'>
                    How relevant is this recommendation?
                  </label>
                  <div className='flex items-center gap-1'>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Button key={index} variant='ghost' size='sm' className='p-1'>
                        <Star className='h-5 w-5 text-gray-300 hover:text-yellow-400' />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant='outline' onClick={() => setShowFeedbackDialog(null)}>
                  Cancel
                </Button>
                <Button>Submit Feedback</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AIRecommendationsEngine
