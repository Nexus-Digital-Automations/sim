/**
 * Video Tutorial System - Main integration component for comprehensive multimedia help
 *
 * Features:
 * - Unified video tutorials and interactive guides system
 * - Context-aware content recommendations and delivery
 * - Integrated analytics and progress tracking
 * - Content management and organization
 * - Multi-modal learning experiences
 * - Progressive skill development paths
 * - Community-driven content enhancement
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpenIcon,
  HelpCircleIcon,
  PlayCircleIcon,
  SettingsIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'
import HelpContentManager from './content-management/HelpContentManager'
import InteractiveGuideEngine from './interactive-guides/InteractiveGuideEngine'
import VideoAnalyticsProvider from './video-tutorials/VideoAnalyticsProvider'
// Import our specialized components
import VideoTutorialManager from './video-tutorials/VideoTutorialManager'

// ========================
// TYPE DEFINITIONS
// ========================

export interface VideoTutorialSystemProps {
  className?: string

  // Feature toggles
  showAnalytics?: boolean
  enableContentManagement?: boolean
  enableRecommendations?: boolean
  enableProgressTracking?: boolean

  // User experience options
  autoStartGuides?: boolean
  contextualRecommendations?: boolean
  personalizedLearningPaths?: boolean

  // Administrative features
  adminMode?: boolean
  enableCollaboration?: boolean
  enableVersioning?: boolean

  // Integration options
  workflowContext?: WorkflowContext
  onContentComplete?: (contentId: string, type: 'tutorial' | 'guide') => void
  onProgressUpdate?: (progress: LearningProgress) => void
}

export interface WorkflowContext {
  currentWorkflow?: string
  workflowState?: string
  userAction?: string
  blockTypes?: string[]
  errorConditions?: string[]
}

export interface LearningProgress {
  userId: string
  totalTutorialsCompleted: number
  totalGuidesCompleted: number
  skillLevels: Record<string, number>
  learningPathProgress: Record<string, number>
  achievements: Achievement[]
  streakDays: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface SystemMetrics {
  totalUsers: number
  activeTutorials: number
  activeGuides: number
  completionRate: number
  averageEngagement: number
  contentLibrarySize: number
}

// ========================
// MAIN COMPONENT
// ========================

/**
 * Video Tutorial System - Complete multimedia help system
 *
 * Integrates video tutorials, interactive guides, content management,
 * and analytics into a unified learning experience.
 */
export function VideoTutorialSystem({
  className,
  showAnalytics = true,
  enableContentManagement = false,
  enableRecommendations = true,
  enableProgressTracking = true,
  autoStartGuides = true,
  contextualRecommendations = true,
  personalizedLearningPaths = true,
  adminMode = false,
  enableCollaboration = true,
  enableVersioning = true,
  workflowContext,
  onContentComplete,
  onProgressUpdate,
}: VideoTutorialSystemProps) {
  const { state: helpState } = useHelp()

  // Core state
  const [activeTab, setActiveTab] = useState('tutorials')
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [userProgress, setUserProgress] = useState<LearningProgress | null>(null)
  const [recommendedContent, setRecommendedContent] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Context-aware state
  const [currentGuideId, setCurrentGuideId] = useState<string | null>(null)
  const [contextFilters, setContextFilters] = useState<string[]>([])

  // ========================
  // DATA LOADING
  // ========================

  const loadSystemMetrics = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/help/system/metrics')
      // const metrics = await response.json()

      // Mock metrics for demonstration
      const metrics: SystemMetrics = {
        totalUsers: 15420,
        activeTutorials: 45,
        activeGuides: 23,
        completionRate: 0.78,
        averageEngagement: 4.6,
        contentLibrarySize: 156,
      }

      setSystemMetrics(metrics)
    } catch (error) {
      console.error('Error loading system metrics:', error)
    }
  }, [])

  const loadUserProgress = useCallback(async () => {
    if (!helpState.userId || !enableProgressTracking) return

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/help/users/${helpState.userId}/progress`)
      // const progress = await response.json()

      // Mock progress for demonstration
      const progress: LearningProgress = {
        userId: helpState.userId,
        totalTutorialsCompleted: 12,
        totalGuidesCompleted: 8,
        skillLevels: {
          'workflow-building': 3,
          automation: 2,
          integrations: 1,
        },
        learningPathProgress: {
          'automation-mastery': 0.65,
          'advanced-workflows': 0.25,
        },
        achievements: [
          {
            id: 'first-tutorial',
            name: 'First Steps',
            description: 'Completed your first tutorial',
            icon: 'play-circle',
            unlockedAt: '2025-01-03T10:00:00Z',
            rarity: 'common',
          },
        ],
        streakDays: 5,
      }

      setUserProgress(progress)
      onProgressUpdate?.(progress)
    } catch (error) {
      console.error('Error loading user progress:', error)
    }
  }, [helpState.userId, enableProgressTracking, onProgressUpdate])

  const loadContextualRecommendations = useCallback(async () => {
    if (!enableRecommendations || !contextualRecommendations) return

    try {
      // Build context filters from workflow state
      const filters: string[] = []

      if (workflowContext?.workflowState) {
        filters.push(workflowContext.workflowState)
      }

      if (workflowContext?.userAction) {
        filters.push(workflowContext.userAction)
      }

      if (workflowContext?.blockTypes) {
        filters.push(...workflowContext.blockTypes)
      }

      if (workflowContext?.errorConditions) {
        filters.push(...workflowContext.errorConditions)
      }

      setContextFilters(filters)

      // TODO: Load recommendations based on context
      // const response = await fetch('/api/help/recommendations', {
      //   method: 'POST',
      //   body: JSON.stringify({ context: workflowContext, filters })
      // })
      // const recommendations = await response.json()

      // Mock recommendations
      const recommendations = [
        {
          id: 'rec-1',
          type: 'tutorial',
          title: 'API Integration Basics',
          reason: 'Based on your current workflow state',
          relevanceScore: 0.95,
        },
      ]

      setRecommendedContent(recommendations)
    } catch (error) {
      console.error('Error loading contextual recommendations:', error)
    }
  }, [enableRecommendations, contextualRecommendations, workflowContext])

  // ========================
  // CONTENT INTERACTION HANDLERS
  // ========================

  const handleTutorialComplete = useCallback(
    (tutorialId: string) => {
      // Update user progress
      if (userProgress) {
        const updatedProgress = {
          ...userProgress,
          totalTutorialsCompleted: userProgress.totalTutorialsCompleted + 1,
        }
        setUserProgress(updatedProgress)
        onProgressUpdate?.(updatedProgress)
      }

      // Track completion
      helpAnalytics.trackHelpInteraction(
        tutorialId,
        helpState.sessionId,
        'tutorial_complete',
        'video_tutorial_system',
        { context: workflowContext }
      )

      onContentComplete?.(tutorialId, 'tutorial')
    },
    [userProgress, onProgressUpdate, helpState.sessionId, workflowContext, onContentComplete]
  )

  const handleGuideComplete = useCallback(
    (guideId: string) => {
      // Update user progress
      if (userProgress) {
        const updatedProgress = {
          ...userProgress,
          totalGuidesCompleted: userProgress.totalGuidesCompleted + 1,
        }
        setUserProgress(updatedProgress)
        onProgressUpdate?.(updatedProgress)
      }

      // Track completion
      helpAnalytics.trackHelpInteraction(
        guideId,
        helpState.sessionId,
        'guide_complete',
        'video_tutorial_system',
        { context: workflowContext }
      )

      onContentComplete?.(guideId, 'guide')
      setCurrentGuideId(null)
    },
    [userProgress, onProgressUpdate, helpState.sessionId, workflowContext, onContentComplete]
  )

  const handleContextualGuideStart = useCallback(
    (guideId: string) => {
      setCurrentGuideId(guideId)
      setActiveTab('guides')

      // Track contextual guide activation
      helpAnalytics.trackHelpInteraction(
        guideId,
        helpState.sessionId,
        'contextual_guide_start',
        'video_tutorial_system',
        { context: workflowContext, autoStart: autoStartGuides }
      )
    },
    [helpState.sessionId, workflowContext, autoStartGuides]
  )

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    loadSystemMetrics()
    loadUserProgress()
  }, [loadSystemMetrics, loadUserProgress])

  useEffect(() => {
    loadContextualRecommendations()
  }, [loadContextualRecommendations])

  // Auto-start guides based on context
  useEffect(() => {
    if (autoStartGuides && workflowContext && recommendedContent.length > 0) {
      const contextualGuide = recommendedContent.find(
        (rec) => rec.type === 'guide' && rec.relevanceScore > 0.8
      )

      if (contextualGuide && !currentGuideId) {
        // Small delay to avoid overwhelming the user
        setTimeout(() => {
          handleContextualGuideStart(contextualGuide.id)
        }, 1000)
      }
    }
  }, [
    autoStartGuides,
    workflowContext,
    recommendedContent,
    currentGuideId,
    handleContextualGuideStart,
  ])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderSystemOverview = () => {
    if (!showAnalytics || !systemMetrics) return null

    return (
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <UsersIcon className='w-4 h-4 mr-2' />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemMetrics.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <PlayCircleIcon className='w-4 h-4 mr-2' />
              Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemMetrics.activeTutorials}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <BookOpenIcon className='w-4 h-4 mr-2' />
              Guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemMetrics.activeGuides}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium flex items-center'>
              <TrendingUpIcon className='w-4 h-4 mr-2' />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {Math.round(systemMetrics.completionRate * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemMetrics.averageEngagement}/5</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemMetrics.contentLibrarySize}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderUserProgress = () => {
    if (!userProgress || !enableProgressTracking) return null

    return (
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <TrendingUpIcon className='w-5 h-5 mr-2' />
            Your Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600'>
                {userProgress.totalTutorialsCompleted}
              </div>
              <div className='text-sm text-muted-foreground'>Tutorials Completed</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {userProgress.totalGuidesCompleted}
              </div>
              <div className='text-sm text-muted-foreground'>Guides Completed</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-orange-600'>
                {userProgress.achievements.length}
              </div>
              <div className='text-sm text-muted-foreground'>Achievements</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-600'>{userProgress.streakDays}</div>
              <div className='text-sm text-muted-foreground'>Day Streak</div>
            </div>
          </div>

          {personalizedLearningPaths &&
            Object.keys(userProgress.learningPathProgress).length > 0 && (
              <div>
                <h4 className='font-semibold mb-2'>Learning Path Progress</h4>
                <div className='space-y-2'>
                  {Object.entries(userProgress.learningPathProgress).map(([pathId, progress]) => (
                    <div key={pathId}>
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='capitalize'>{pathId.replace('-', ' ')}</span>
                        <span>{Math.round(progress * 100)}%</span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-2'>
                        <div
                          className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    )
  }

  const renderContextualRecommendations = () => {
    if (!enableRecommendations || !contextualRecommendations || recommendedContent.length === 0)
      return null

    return (
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <HelpCircleIcon className='w-5 h-5 mr-2' />
            Recommended for You
          </CardTitle>
          {workflowContext && (
            <p className='text-sm text-muted-foreground'>
              Based on your current workflow: {workflowContext.workflowState}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {recommendedContent.slice(0, 3).map((rec) => (
              <div key={rec.id} className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center space-x-3'>
                  {rec.type === 'tutorial' ? (
                    <PlayCircleIcon className='w-5 h-5 text-blue-600' />
                  ) : (
                    <BookOpenIcon className='w-5 h-5 text-green-600' />
                  )}
                  <div>
                    <h4 className='font-medium'>{rec.title}</h4>
                    <p className='text-sm text-muted-foreground'>{rec.reason}</p>
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <Badge variant='outline'>{Math.round(rec.relevanceScore * 100)}% match</Badge>
                  <Button
                    size='sm'
                    onClick={() => {
                      if (rec.type === 'guide') {
                        handleContextualGuideStart(rec.id)
                      } else {
                        setActiveTab('tutorials')
                      }
                    }}
                  >
                    {rec.type === 'tutorial' ? 'Watch' : 'Start Guide'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <VideoAnalyticsProvider>
      <div className={cn('space-y-6', className)}>
        {/* System Overview */}
        {renderSystemOverview()}

        {/* User Progress */}
        {renderUserProgress()}

        {/* Contextual Recommendations */}
        {renderContextualRecommendations()}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
          <TabsList>
            <TabsTrigger value='tutorials' className='flex items-center'>
              <PlayCircleIcon className='w-4 h-4 mr-2' />
              Video Tutorials
            </TabsTrigger>
            <TabsTrigger value='guides' className='flex items-center'>
              <BookOpenIcon className='w-4 h-4 mr-2' />
              Interactive Guides
            </TabsTrigger>
            {showAnalytics && (
              <TabsTrigger value='analytics' className='flex items-center'>
                <TrendingUpIcon className='w-4 h-4 mr-2' />
                Analytics
              </TabsTrigger>
            )}
            {(adminMode || enableContentManagement) && (
              <TabsTrigger value='management' className='flex items-center'>
                <SettingsIcon className='w-4 h-4 mr-2' />
                Content Management
              </TabsTrigger>
            )}
          </TabsList>

          {/* Video Tutorials Tab */}
          <TabsContent value='tutorials'>
            <VideoTutorialManager
              contextFilters={contextFilters}
              showCategories={true}
              showLearningPaths={personalizedLearningPaths}
              showProgress={enableProgressTracking}
              enableRecommendations={enableRecommendations}
              enablePracticeMode={true}
            />
          </TabsContent>

          {/* Interactive Guides Tab */}
          <TabsContent value='guides'>
            <InteractiveGuideEngine
              guideId={currentGuideId || undefined}
              autoStart={autoStartGuides && !!currentGuideId}
              showProgress={enableProgressTracking}
              allowSkipping={true}
              enableTroubleshooting={true}
              onComplete={(guideId) => handleGuideComplete(guideId)}
            />
          </TabsContent>

          {/* Analytics Tab */}
          {showAnalytics && (
            <TabsContent value='analytics'>
              <div className='space-y-6'>
                <h2 className='text-xl font-semibold'>Learning Analytics</h2>
                <p className='text-muted-foreground'>
                  Comprehensive analytics and insights will be implemented here. This would include
                  detailed metrics on user engagement, content performance, learning outcomes, and
                  system optimization recommendations.
                </p>

                {/* Placeholder for analytics dashboard */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className='text-muted-foreground'>
                        Detailed content performance metrics and optimization suggestions.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Learning Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className='text-muted-foreground'>
                        Analysis of user learning behaviors and progression patterns.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Content Management Tab */}
          {(adminMode || enableContentManagement) && (
            <TabsContent value='management'>
              <HelpContentManager
                showAnalytics={showAnalytics}
                enableCollaboration={enableCollaboration}
                enableVersioning={enableVersioning}
                enableLocalization={true}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </VideoAnalyticsProvider>
  )
}

// ========================
// EXPORTS
// ========================

export default VideoTutorialSystem
export type {
  VideoTutorialSystemProps,
  WorkflowContext,
  LearningProgress,
  Achievement,
  SystemMetrics,
}
