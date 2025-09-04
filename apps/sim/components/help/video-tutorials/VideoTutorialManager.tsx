/**
 * Video Tutorial Manager - Core component for managing video tutorial system
 *
 * Features:
 * - Tutorial library management with categorization
 * - Progressive skill tracking and user analytics
 * - Context-aware tutorial recommendations
 * - Interactive tutorial playlists and learning paths
 * - Integration with help context system
 * - CDN-optimized video delivery with adaptive streaming
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayCircleIcon,
  StarIcon,
  UsersIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { helpAnalytics } from '@/lib/help/help-analytics'
import { useHelp } from '@/lib/help/help-context-provider'
import { cn } from '@/lib/utils'
import VideoPlayer from '../video/VideoPlayer/VideoPlayer'

// ========================
// TYPE DEFINITIONS
// ========================

export interface VideoTutorial {
  id: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  posterUrl?: string
  duration: number

  // Content organization
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  skillLevel: number

  // Learning tracking
  completionRate: number
  averageRating: number
  totalViews: number

  // Interactive features
  chapters: VideoChapter[]
  annotations: VideoAnnotation[]
  captions: VideoCaptions[]
  qualities: VideoQuality[]

  // Prerequisites and relationships
  prerequisites: string[]
  relatedTutorials: string[]
  nextRecommendation?: string

  // Content metadata
  author: string
  createdAt: string
  updatedAt: string
  language: string

  // Context awareness
  contextTriggers: ContextTrigger[]
  workflowRelevance: WorkflowRelevance[]
}

export interface VideoChapter {
  id: string
  title: string
  startTime: number
  endTime: number
  description?: string
  thumbnail?: string
  keyPoints: string[]
  practiceExercise?: PracticeExercise
}

export interface VideoAnnotation {
  id: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  content: string
  type: 'tooltip' | 'link' | 'overlay' | 'interactive' | 'practice'
  action?: () => void
  data?: any
}

export interface VideoCaptions {
  id: string
  language: string
  label: string
  src: string
  default?: boolean
}

export interface VideoQuality {
  id: string
  label: string
  height: number
  bitrate: number
  src: string
}

export interface ContextTrigger {
  type: 'workflow_state' | 'error_pattern' | 'user_action' | 'block_type'
  condition: string
  relevanceScore: number
}

export interface WorkflowRelevance {
  workflowType: string
  blockTypes: string[]
  userActions: string[]
  relevanceScore: number
}

export interface PracticeExercise {
  id: string
  title: string
  description: string
  instructions: string[]
  expectedOutcome: string
  hints: string[]
  validationRules: ValidationRule[]
}

export interface ValidationRule {
  type: 'workflow_completion' | 'block_configuration' | 'output_validation'
  condition: string
  message: string
}

export interface TutorialCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  tutorials: string[]
  subcategories: TutorialSubcategory[]
}

export interface TutorialSubcategory {
  id: string
  name: string
  description: string
  tutorials: string[]
}

export interface LearningPath {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  tutorials: string[]
  prerequisites: string[]
  completionRewards: CompletionReward[]
}

export interface CompletionReward {
  type: 'badge' | 'certification' | 'feature_unlock' | 'community_recognition'
  name: string
  description: string
  icon: string
}

export interface UserProgress {
  userId: string
  tutorialProgress: Record<string, TutorialProgress>
  learningPathProgress: Record<string, LearningPathProgress>
  skillLevels: Record<string, number>
  achievements: Achievement[]
  totalWatchTime: number
  streakDays: number
  lastActivity: string
}

export interface TutorialProgress {
  tutorialId: string
  watchProgress: number
  completed: boolean
  completedAt?: string
  rating?: number
  notes: string[]
  bookmarkedChapters: string[]
  practiceExercisesCompleted: string[]
}

export interface LearningPathProgress {
  pathId: string
  currentTutorialIndex: number
  completedTutorials: string[]
  overallProgress: number
  startedAt: string
  estimatedCompletion?: string
}

export interface Achievement {
  id: string
  type: 'tutorial_completion' | 'learning_path' | 'streak' | 'skill_mastery'
  name: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface VideoTutorialManagerProps {
  className?: string
  contextFilters?: string[]
  showCategories?: boolean
  showLearningPaths?: boolean
  showProgress?: boolean
  enableRecommendations?: boolean
  enablePracticeMode?: boolean
}

// ========================
// MOCK DATA - TO BE REPLACED WITH API CALLS
// ========================

const MOCK_CATEGORIES: TutorialCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential tutorials for new users',
    icon: 'PlayCircleIcon',
    color: 'bg-blue-500',
    tutorials: ['tutorial-1', 'tutorial-2'],
    subcategories: [
      {
        id: 'basics',
        name: 'Basics',
        description: 'Fundamental concepts',
        tutorials: ['tutorial-1'],
      },
    ],
  },
  {
    id: 'workflow-building',
    name: 'Workflow Building',
    description: 'Learn to create powerful workflows',
    icon: 'BookOpenIcon',
    color: 'bg-green-500',
    tutorials: ['tutorial-3', 'tutorial-4'],
    subcategories: [],
  },
]

const MOCK_TUTORIALS: VideoTutorial[] = [
  {
    id: 'tutorial-1',
    title: 'Introduction to Sim Workflows',
    description: 'Learn the fundamentals of creating your first automation workflow',
    thumbnail: '/tutorials/thumbnails/intro-workflows.jpg',
    videoUrl: '/tutorials/videos/intro-workflows.mp4',
    posterUrl: '/tutorials/posters/intro-workflows.jpg',
    duration: 480,
    category: 'getting-started',
    tags: ['basics', 'workflows', 'automation'],
    difficulty: 'beginner',
    skillLevel: 1,
    completionRate: 85,
    averageRating: 4.8,
    totalViews: 15420,
    chapters: [
      {
        id: 'intro-1',
        title: 'What are Workflows?',
        startTime: 0,
        endTime: 120,
        description: 'Understanding the basics of automation workflows',
        keyPoints: ['Definition of workflows', 'Benefits of automation', 'Use cases'],
        practiceExercise: {
          id: 'practice-1',
          title: 'Create Your First Workflow',
          description: 'Follow along to create a simple workflow',
          instructions: [
            'Open the workflow editor',
            'Add a starter block',
            'Configure the trigger',
          ],
          expectedOutcome: 'A basic workflow with a starter block',
          hints: ['Look for the + button to add blocks'],
          validationRules: [
            {
              type: 'workflow_completion',
              condition: 'workflow.blocks.length > 0',
              message: 'Workflow must contain at least one block',
            },
          ],
        },
      },
    ],
    annotations: [],
    captions: [
      {
        id: 'en-captions',
        language: 'en',
        label: 'English',
        src: '/tutorials/captions/intro-workflows-en.vtt',
        default: true,
      },
    ],
    qualities: [
      {
        id: 'hd',
        label: '720p HD',
        height: 720,
        bitrate: 2500,
        src: '/tutorials/videos/intro-workflows-720p.mp4',
      },
    ],
    prerequisites: [],
    relatedTutorials: ['tutorial-2'],
    nextRecommendation: 'tutorial-2',
    author: 'Sim Team',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
    language: 'en',
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'empty_canvas',
        relevanceScore: 0.9,
      },
    ],
    workflowRelevance: [
      {
        workflowType: 'automation',
        blockTypes: ['starter'],
        userActions: ['create_workflow'],
        relevanceScore: 0.95,
      },
    ],
  },
]

const MOCK_LEARNING_PATHS: LearningPath[] = [
  {
    id: 'automation-mastery',
    name: 'Automation Mastery',
    description: 'Complete guide from beginner to advanced automation',
    difficulty: 'beginner',
    estimatedTime: 1200,
    tutorials: ['tutorial-1', 'tutorial-2', 'tutorial-3'],
    prerequisites: [],
    completionRewards: [
      {
        type: 'badge',
        name: 'Automation Expert',
        description: 'Mastered the art of automation',
        icon: 'star',
      },
    ],
  },
]

// ========================
// MAIN COMPONENT
// ========================

/**
 * Video Tutorial Manager Component
 *
 * Comprehensive video tutorial management system with learning paths,
 * progress tracking, and context-aware recommendations.
 */
export function VideoTutorialManager({
  className,
  contextFilters = [],
  showCategories = true,
  showLearningPaths = true,
  showProgress = true,
  enableRecommendations = true,
  enablePracticeMode = true,
}: VideoTutorialManagerProps) {
  const { state: helpState } = useHelp()

  // Core state
  const [tutorials, setTutorials] = useState<VideoTutorial[]>(MOCK_TUTORIALS)
  const [categories, setCategories] = useState<TutorialCategory[]>(MOCK_CATEGORIES)
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>(MOCK_LEARNING_PATHS)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)

  // UI state
  const [selectedTutorial, setSelectedTutorial] = useState<VideoTutorial | null>(null)
  const [activeTab, setActiveTab] = useState('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // ========================
  // DATA FETCHING
  // ========================

  const loadTutorials = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API calls
      // const response = await fetch('/api/help/tutorials')
      // const data = await response.json()
      // setTutorials(data.tutorials)
      // setCategories(data.categories)

      // Track tutorial library access
      helpAnalytics.trackHelpInteraction(
        'tutorial-manager',
        helpState.sessionId,
        'library_access',
        'video_tutorials',
        { contextFilters, searchQuery }
      )
    } catch (error) {
      console.error('Error loading tutorials:', error)
    } finally {
      setIsLoading(false)
    }
  }, [helpState.sessionId, contextFilters, searchQuery])

  const loadUserProgress = useCallback(async () => {
    try {
      // TODO: Replace with actual API calls
      // const response = await fetch('/api/help/tutorials/progress')
      // const data = await response.json()
      // setUserProgress(data.progress)

      // Mock progress for demonstration
      setUserProgress({
        userId: 'user-123',
        tutorialProgress: {
          'tutorial-1': {
            tutorialId: 'tutorial-1',
            watchProgress: 0.65,
            completed: false,
            notes: ['Great introduction to workflows'],
            bookmarkedChapters: ['intro-1'],
            practiceExercisesCompleted: [],
          },
        },
        learningPathProgress: {
          'automation-mastery': {
            pathId: 'automation-mastery',
            currentTutorialIndex: 0,
            completedTutorials: [],
            overallProgress: 0.15,
            startedAt: '2025-01-04T09:00:00Z',
          },
        },
        skillLevels: {
          'workflow-building': 2,
          automation: 1,
        },
        achievements: [],
        totalWatchTime: 1800,
        streakDays: 3,
        lastActivity: '2025-01-04T12:00:00Z',
      })
    } catch (error) {
      console.error('Error loading user progress:', error)
    }
  }, [])

  // ========================
  // TUTORIAL SELECTION AND PLAYBACK
  // ========================

  const selectTutorial = useCallback(
    (tutorial: VideoTutorial) => {
      setSelectedTutorial(tutorial)

      // Track tutorial selection
      helpAnalytics.trackHelpInteraction(
        tutorial.id,
        helpState.sessionId,
        'tutorial_select',
        'video_tutorials',
        {
          tutorialTitle: tutorial.title,
          category: tutorial.category,
          difficulty: tutorial.difficulty,
        }
      )
    },
    [helpState.sessionId]
  )

  const handleVideoComplete = useCallback(
    async (tutorialId: string, duration: number) => {
      try {
        // Update user progress
        // TODO: Replace with actual API call
        // await fetch('/api/help/tutorials/progress', {
        //   method: 'POST',
        //   body: JSON.stringify({ tutorialId, completed: true, watchTime: duration })
        // })

        // Update local state
        setUserProgress((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            tutorialProgress: {
              ...prev.tutorialProgress,
              [tutorialId]: {
                ...prev.tutorialProgress[tutorialId],
                completed: true,
                completedAt: new Date().toISOString(),
                watchProgress: 1.0,
              },
            },
          }
        })

        // Track completion
        helpAnalytics.trackHelpInteraction(
          tutorialId,
          helpState.sessionId,
          'tutorial_complete',
          'video_tutorials',
          { duration, completionTime: Date.now() }
        )
      } catch (error) {
        console.error('Error updating tutorial progress:', error)
      }
    },
    [helpState.sessionId]
  )

  // ========================
  // FILTERING AND SEARCH
  // ========================

  const filteredTutorials = useCallback(() => {
    let filtered = tutorials

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (tutorial) =>
          tutorial.title.toLowerCase().includes(query) ||
          tutorial.description.toLowerCase().includes(query) ||
          tutorial.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((tutorial) => tutorial.category === selectedCategory)
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((tutorial) => tutorial.difficulty === selectedDifficulty)
    }

    // Apply context filters
    if (contextFilters.length > 0) {
      filtered = filtered.filter((tutorial) =>
        tutorial.contextTriggers.some(
          (trigger) =>
            contextFilters.includes(trigger.type) || contextFilters.includes(trigger.condition)
        )
      )
    }

    return filtered
  }, [tutorials, searchQuery, selectedCategory, selectedDifficulty, contextFilters])

  // ========================
  // RECOMMENDATIONS
  // ========================

  const getRecommendedTutorials = useCallback(() => {
    if (!enableRecommendations || !userProgress) return []

    // Simple recommendation logic based on user progress and context
    return tutorials
      .filter((tutorial) => !userProgress.tutorialProgress[tutorial.id]?.completed)
      .sort((a, b) => {
        // Prioritize by skill level and context relevance
        const aRelevance = a.contextTriggers.reduce(
          (sum, trigger) => sum + trigger.relevanceScore,
          0
        )
        const bRelevance = b.contextTriggers.reduce(
          (sum, trigger) => sum + trigger.relevanceScore,
          0
        )
        return bRelevance - aRelevance
      })
      .slice(0, 3)
  }, [tutorials, userProgress, enableRecommendations])

  // ========================
  // EFFECTS
  // ========================

  useEffect(() => {
    loadTutorials()
    loadUserProgress()
  }, [loadTutorials, loadUserProgress])

  // ========================
  // RENDER HELPERS
  // ========================

  const renderTutorialCard = (tutorial: VideoTutorial) => {
    const progress = userProgress?.tutorialProgress[tutorial.id]
    const isCompleted = progress?.completed || false
    const watchProgress = progress?.watchProgress || 0

    return (
      <Card key={tutorial.id} className='group cursor-pointer transition-shadow hover:shadow-lg'>
        <CardHeader className='pb-2'>
          <div className='relative'>
            <img
              src={tutorial.thumbnail}
              alt={tutorial.title}
              className='h-32 w-full rounded-md object-cover'
            />
            <div className='absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'>
              <Button variant='secondary' size='sm' onClick={() => selectTutorial(tutorial)}>
                <PlayCircleIcon className='mr-1 h-4 w-4' />
                Watch
              </Button>
            </div>

            {/* Duration Badge */}
            <Badge className='absolute top-2 right-2 bg-black/70 text-white'>
              <ClockIcon className='mr-1 h-3 w-3' />
              {Math.floor(tutorial.duration / 60)}m
            </Badge>

            {/* Completion Badge */}
            {isCompleted && (
              <Badge className='absolute top-2 left-2 bg-green-600 text-white'>
                <CheckCircleIcon className='mr-1 h-3 w-3' />
                Complete
              </Badge>
            )}
          </div>

          <CardTitle className='mt-2 font-medium text-sm'>{tutorial.title}</CardTitle>
        </CardHeader>

        <CardContent className='pt-0'>
          <p className='mb-2 line-clamp-2 text-muted-foreground text-sm'>{tutorial.description}</p>

          {/* Progress bar */}
          {watchProgress > 0 && (
            <div className='mb-2'>
              <Progress value={watchProgress * 100} className='h-2' />
              <div className='mt-1 text-muted-foreground text-xs'>
                {Math.round(watchProgress * 100)}% watched
              </div>
            </div>
          )}

          {/* Tutorial metadata */}
          <div className='flex items-center justify-between text-muted-foreground text-xs'>
            <div className='flex items-center space-x-2'>
              <Badge variant='outline' className='text-xs'>
                {tutorial.difficulty}
              </Badge>
              <div className='flex items-center'>
                <StarIcon className='mr-1 h-3 w-3 fill-yellow-400 text-yellow-400' />
                {tutorial.averageRating}
              </div>
            </div>
            <div className='flex items-center'>
              <UsersIcon className='mr-1 h-3 w-3' />
              {tutorial.totalViews.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCategorySection = (category: TutorialCategory) => {
    const categoryTutorials = tutorials.filter((t) => t.category === category.id)

    return (
      <div key={category.id} className='mb-8'>
        <div className='mb-4 flex items-center'>
          <div
            className={cn(
              'mr-3 flex h-8 w-8 items-center justify-center rounded-md',
              category.color
            )}
          >
            <BookOpenIcon className='h-4 w-4 text-white' />
          </div>
          <div>
            <h3 className='font-semibold text-lg'>{category.name}</h3>
            <p className='text-muted-foreground text-sm'>{category.description}</p>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {categoryTutorials.map(renderTutorialCard)}
        </div>
      </div>
    )
  }

  const renderLearningPath = (path: LearningPath) => {
    const progress = userProgress?.learningPathProgress[path.id]
    const pathProgress = progress?.overallProgress || 0

    return (
      <Card key={path.id} className='p-4'>
        <div className='mb-3 flex items-start justify-between'>
          <div>
            <h4 className='font-semibold'>{path.name}</h4>
            <p className='text-muted-foreground text-sm'>{path.description}</p>
          </div>
          <Badge
            variant={
              path.difficulty === 'beginner'
                ? 'default'
                : path.difficulty === 'intermediate'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {path.difficulty}
          </Badge>
        </div>

        <div className='mb-3'>
          <div className='mb-1 flex items-center justify-between text-sm'>
            <span>Progress</span>
            <span>{Math.round(pathProgress * 100)}%</span>
          </div>
          <Progress value={pathProgress * 100} className='h-2' />
        </div>

        <div className='mb-3 flex items-center justify-between text-muted-foreground text-sm'>
          <div className='flex items-center'>
            <ClockIcon className='mr-1 h-4 w-4' />
            {Math.floor(path.estimatedTime / 60)} hours
          </div>
          <div className='flex items-center'>
            <BookOpenIcon className='mr-1 h-4 w-4' />
            {path.tutorials.length} tutorials
          </div>
        </div>

        <Button
          variant='outline'
          className='w-full'
          onClick={() => {
            // Navigate to first incomplete tutorial in path
            const nextTutorial = tutorials.find(
              (t) =>
                path.tutorials.includes(t.id) && !userProgress?.tutorialProgress[t.id]?.completed
            )
            if (nextTutorial) selectTutorial(nextTutorial)
          }}
        >
          {progress ? 'Continue' : 'Start'} Path
        </Button>
      </Card>
    )
  }

  // ========================
  // MAIN RENDER
  // ========================

  return (
    <div className={cn('space-y-6', className)}>
      {/* Video Player Modal */}
      {selectedTutorial && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
          <div className='w-full max-w-6xl overflow-hidden rounded-lg bg-background'>
            <div className='border-b p-4'>
              <div className='flex items-center justify-between'>
                <h2 className='font-semibold text-xl'>{selectedTutorial.title}</h2>
                <Button variant='ghost' onClick={() => setSelectedTutorial(null)}>
                  ×
                </Button>
              </div>
            </div>

            <div className='aspect-video'>
              <VideoPlayer
                videoId={selectedTutorial.id}
                videoUrl={selectedTutorial.videoUrl}
                posterUrl={selectedTutorial.posterUrl}
                title={selectedTutorial.title}
                description={selectedTutorial.description}
                duration={selectedTutorial.duration}
                chapters={selectedTutorial.chapters}
                annotations={selectedTutorial.annotations}
                captions={selectedTutorial.captions}
                qualities={selectedTutorial.qualities}
                onComplete={(duration) => handleVideoComplete(selectedTutorial.id, duration)}
                enableAnnotations={enablePracticeMode}
                enableChapters={true}
                enableTranscripts={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Management Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='browse'>Browse</TabsTrigger>
          {showLearningPaths && <TabsTrigger value='paths'>Learning Paths</TabsTrigger>}
          {showProgress && <TabsTrigger value='progress'>My Progress</TabsTrigger>}
          {enableRecommendations && <TabsTrigger value='recommended'>Recommended</TabsTrigger>}
        </TabsList>

        {/* Search and Filters */}
        <div className='flex flex-col gap-4 sm:flex-row'>
          <Input
            placeholder='Search tutorials...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='flex-1'
          />

          {showCategories && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='All Categories' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className='w-40'>
              <SelectValue placeholder='All Levels' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Levels</SelectItem>
              <SelectItem value='beginner'>Beginner</SelectItem>
              <SelectItem value='intermediate'>Intermediate</SelectItem>
              <SelectItem value='advanced'>Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Browse Tab */}
        <TabsContent value='browse' className='space-y-6'>
          {showCategories ? (
            <div className='space-y-8'>{categories.map(renderCategorySection)}</div>
          ) : (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {filteredTutorials().map(renderTutorialCard)}
            </div>
          )}
        </TabsContent>

        {/* Learning Paths Tab */}
        {showLearningPaths && (
          <TabsContent value='paths' className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {learningPaths.map(renderLearningPath)}
            </div>
          </TabsContent>
        )}

        {/* Progress Tab */}
        {showProgress && userProgress && (
          <TabsContent value='progress' className='space-y-6'>
            {/* Overall Statistics */}
            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
              <Card className='p-4 text-center'>
                <div className='font-bold text-2xl text-blue-600'>
                  {Object.values(userProgress.tutorialProgress).filter((p) => p.completed).length}
                </div>
                <div className='text-muted-foreground text-sm'>Tutorials Completed</div>
              </Card>

              <Card className='p-4 text-center'>
                <div className='font-bold text-2xl text-green-600'>
                  {Math.floor(userProgress.totalWatchTime / 3600)}h
                </div>
                <div className='text-muted-foreground text-sm'>Hours Watched</div>
              </Card>

              <Card className='p-4 text-center'>
                <div className='font-bold text-2xl text-orange-600'>{userProgress.streakDays}</div>
                <div className='text-muted-foreground text-sm'>Day Streak</div>
              </Card>

              <Card className='p-4 text-center'>
                <div className='font-bold text-2xl text-purple-600'>
                  {userProgress.achievements.length}
                </div>
                <div className='text-muted-foreground text-sm'>Achievements</div>
              </Card>
            </div>

            {/* In Progress Tutorials */}
            <div>
              <h3 className='mb-4 font-semibold text-lg'>In Progress</h3>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {tutorials
                  .filter((tutorial) => {
                    const progress = userProgress.tutorialProgress[tutorial.id]
                    return progress && !progress.completed && progress.watchProgress > 0
                  })
                  .map(renderTutorialCard)}
              </div>
            </div>
          </TabsContent>
        )}

        {/* Recommended Tab */}
        {enableRecommendations && (
          <TabsContent value='recommended' className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {getRecommendedTutorials().map(renderTutorialCard)}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ========================
// EXPORTS
// ========================

export default VideoTutorialManager
export type {
  VideoTutorial,
  TutorialCategory,
  LearningPath,
  UserProgress,
  VideoTutorialManagerProps,
}
