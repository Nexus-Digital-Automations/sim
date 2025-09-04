/**
 * Video Tutorials API - RESTful endpoints for tutorial management
 *
 * Features:
 * - Tutorial CRUD operations with advanced filtering
 * - User progress tracking and analytics
 * - Learning path management and recommendations
 * - Content organization and categorization
 * - CDN integration for video delivery optimization
 * - Search and discovery with contextual relevance
 *
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('TutorialsAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const tutorialQuerySchema = z.object({
  // Filtering
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.string().optional(), // comma-separated

  // Context filtering
  contextFilters: z.string().optional(), // comma-separated
  workflowState: z.string().optional(),
  userSkillLevel: z.number().min(1).max(10).optional(),

  // Search and discovery
  search: z.string().optional(),
  language: z.string().optional(),

  // Pagination and sorting
  page: z.string().transform((val) => Number.parseInt(val) || 1),
  limit: z.string().transform((val) => Math.min(Number.parseInt(val) || 20, 100)),
  sortBy: z.enum(['created_at', 'updated_at', 'title', 'duration', 'rating', 'views']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),

  // Recommendations
  enableRecommendations: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  includeProgress: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
})

const tutorialProgressSchema = z.object({
  tutorialId: z.string(),
  watchProgress: z.number().min(0).max(1),
  completed: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  bookmarkedChapters: z.array(z.string()).optional(),
  practiceExercisesCompleted: z.array(z.string()).optional(),
})

// ========================
// TYPES
// ========================

interface VideoTutorial {
  id: string
  title: string
  description: string
  thumbnail: string
  videoUrl: string
  posterUrl?: string
  duration: number
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  skillLevel: number
  completionRate: number
  averageRating: number
  totalViews: number
  chapters: VideoChapter[]
  annotations: VideoAnnotation[]
  captions: VideoCaptions[]
  qualities: VideoQuality[]
  prerequisites: string[]
  relatedTutorials: string[]
  nextRecommendation?: string
  author: string
  createdAt: string
  updatedAt: string
  language: string
  contextTriggers: ContextTrigger[]
  workflowRelevance: WorkflowRelevance[]
}

interface VideoChapter {
  id: string
  title: string
  startTime: number
  endTime: number
  description?: string
  thumbnail?: string
  keyPoints: string[]
  practiceExercise?: PracticeExercise
}

interface VideoAnnotation {
  id: string
  startTime: number
  endTime: number
  position: { x: number; y: number }
  content: string
  type: 'tooltip' | 'link' | 'overlay' | 'interactive' | 'practice'
  action?: string
  data?: any
}

interface VideoCaptions {
  id: string
  language: string
  label: string
  src: string
  default?: boolean
}

interface VideoQuality {
  id: string
  label: string
  height: number
  bitrate: number
  src: string
}

interface ContextTrigger {
  type: 'workflow_state' | 'error_pattern' | 'user_action' | 'block_type'
  condition: string
  relevanceScore: number
}

interface WorkflowRelevance {
  workflowType: string
  blockTypes: string[]
  userActions: string[]
  relevanceScore: number
}

interface PracticeExercise {
  id: string
  title: string
  description: string
  instructions: string[]
  expectedOutcome: string
  hints: string[]
  validationRules: ValidationRule[]
}

interface ValidationRule {
  type: 'workflow_completion' | 'block_configuration' | 'output_validation'
  condition: string
  message: string
}

interface TutorialCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  tutorials: string[]
  subcategories: TutorialSubcategory[]
}

interface TutorialSubcategory {
  id: string
  name: string
  description: string
  tutorials: string[]
}

interface UserProgress {
  userId: string
  tutorialProgress: Record<string, TutorialProgress>
  learningPathProgress: Record<string, LearningPathProgress>
  skillLevels: Record<string, number>
  achievements: Achievement[]
  totalWatchTime: number
  streakDays: number
  lastActivity: string
}

interface TutorialProgress {
  tutorialId: string
  watchProgress: number
  completed: boolean
  completedAt?: string
  rating?: number
  notes: string[]
  bookmarkedChapters: string[]
  practiceExercisesCompleted: string[]
}

interface LearningPathProgress {
  pathId: string
  currentTutorialIndex: number
  completedTutorials: string[]
  overallProgress: number
  startedAt: string
  estimatedCompletion?: string
}

interface Achievement {
  id: string
  type: 'tutorial_completion' | 'learning_path' | 'streak' | 'skill_mastery'
  name: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

// ========================
// MOCK DATA - TO BE REPLACED WITH DATABASE
// ========================

const MOCK_TUTORIALS: VideoTutorial[] = [
  {
    id: 'tutorial-1',
    title: 'Introduction to Sim Workflows',
    description: 'Learn the fundamentals of creating your first automation workflow in Sim',
    thumbnail: '/tutorials/thumbnails/intro-workflows.jpg',
    videoUrl: '/tutorials/videos/intro-workflows.mp4',
    posterUrl: '/tutorials/posters/intro-workflows.jpg',
    duration: 480,
    category: 'getting-started',
    tags: ['basics', 'workflows', 'automation', 'beginner'],
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
        keyPoints: ['Definition of workflows', 'Benefits of automation', 'Common use cases'],
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
      {
        id: 'intro-2',
        title: 'Building Your First Workflow',
        startTime: 120,
        endTime: 300,
        description: 'Step by step workflow creation',
        keyPoints: [
          'Adding blocks to workflows',
          'Connecting blocks together',
          'Configuring block settings',
        ],
      },
      {
        id: 'intro-3',
        title: 'Testing and Running Workflows',
        startTime: 300,
        endTime: 480,
        description: 'How to test and execute your workflows',
        keyPoints: [
          'Testing workflows before deployment',
          'Running workflows manually',
          'Monitoring workflow execution',
        ],
      },
    ],
    annotations: [
      {
        id: 'annotation-1',
        startTime: 60,
        endTime: 90,
        position: { x: 50, y: 30 },
        content: 'Click here to access the block library',
        type: 'tooltip',
      },
    ],
    captions: [
      {
        id: 'en-captions',
        language: 'en',
        label: 'English',
        src: '/tutorials/captions/intro-workflows-en.vtt',
        default: true,
      },
      {
        id: 'es-captions',
        language: 'es',
        label: 'Español',
        src: '/tutorials/captions/intro-workflows-es.vtt',
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
      {
        id: 'full-hd',
        label: '1080p Full HD',
        height: 1080,
        bitrate: 5000,
        src: '/tutorials/videos/intro-workflows-1080p.mp4',
      },
    ],
    prerequisites: [],
    relatedTutorials: ['tutorial-2', 'tutorial-3'],
    nextRecommendation: 'tutorial-2',
    author: 'Sim Learning Team',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z',
    language: 'en',
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'empty_canvas',
        relevanceScore: 0.9,
      },
      {
        type: 'user_action',
        condition: 'first_visit',
        relevanceScore: 0.8,
      },
    ],
    workflowRelevance: [
      {
        workflowType: 'automation',
        blockTypes: ['starter', 'action'],
        userActions: ['create_workflow'],
        relevanceScore: 0.95,
      },
    ],
  },
  {
    id: 'tutorial-2',
    title: 'Advanced Block Configuration',
    description: 'Master the art of configuring blocks for complex automation scenarios',
    thumbnail: '/tutorials/thumbnails/advanced-blocks.jpg',
    videoUrl: '/tutorials/videos/advanced-blocks.mp4',
    duration: 720,
    category: 'workflow-building',
    tags: ['blocks', 'configuration', 'advanced', 'automation'],
    difficulty: 'intermediate',
    skillLevel: 3,
    completionRate: 72,
    averageRating: 4.6,
    totalViews: 8950,
    chapters: [],
    annotations: [],
    captions: [],
    qualities: [],
    prerequisites: ['tutorial-1'],
    relatedTutorials: ['tutorial-1', 'tutorial-3'],
    author: 'Sim Learning Team',
    createdAt: '2025-01-04T11:00:00Z',
    updatedAt: '2025-01-04T11:00:00Z',
    language: 'en',
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'has_basic_workflow',
        relevanceScore: 0.8,
      },
    ],
    workflowRelevance: [
      {
        workflowType: 'automation',
        blockTypes: ['api', 'condition', 'loop'],
        userActions: ['configure_block'],
        relevanceScore: 0.85,
      },
    ],
  },
]

const MOCK_CATEGORIES: TutorialCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential tutorials for new Sim users',
    icon: 'play-circle',
    color: 'blue',
    tutorials: ['tutorial-1'],
    subcategories: [
      {
        id: 'basics',
        name: 'Basics',
        description: 'Fundamental concepts and first steps',
        tutorials: ['tutorial-1'],
      },
    ],
  },
  {
    id: 'workflow-building',
    name: 'Workflow Building',
    description: 'Learn to create powerful automation workflows',
    icon: 'workflow',
    color: 'green',
    tutorials: ['tutorial-2'],
    subcategories: [],
  },
]

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/help/tutorials
 * Retrieve tutorials with filtering, search, and recommendations
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Get user session for personalization
    const session = await getSession()
    const userId = session?.user?.id

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    logger.info(`[${requestId}] GET /api/help/tutorials`, {
      userId: userId ? `${userId.slice(0, 8)}...` : 'anonymous',
      queryParams,
    })

    const validatedQuery = tutorialQuerySchema.parse(queryParams)

    // Apply filtering logic
    let filteredTutorials = [...MOCK_TUTORIALS]

    // Category filtering
    if (validatedQuery.category) {
      filteredTutorials = filteredTutorials.filter((t) => t.category === validatedQuery.category)
    }

    // Difficulty filtering
    if (validatedQuery.difficulty) {
      filteredTutorials = filteredTutorials.filter(
        (t) => t.difficulty === validatedQuery.difficulty
      )
    }

    // Tags filtering
    if (validatedQuery.tags) {
      const searchTags = validatedQuery.tags.split(',').map((tag) => tag.trim().toLowerCase())
      filteredTutorials = filteredTutorials.filter((t) =>
        searchTags.some((tag) =>
          t.tags.some((tutorialTag) => tutorialTag.toLowerCase().includes(tag))
        )
      )
    }

    // Search filtering
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase()
      filteredTutorials = filteredTutorials.filter(
        (t) =>
          t.title.toLowerCase().includes(searchTerm) ||
          t.description.toLowerCase().includes(searchTerm) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Context-based filtering
    if (validatedQuery.contextFilters) {
      const contextFilters = validatedQuery.contextFilters.split(',')
      filteredTutorials = filteredTutorials.filter((t) =>
        t.contextTriggers.some(
          (trigger) =>
            contextFilters.includes(trigger.type) || contextFilters.includes(trigger.condition)
        )
      )
    }

    // User skill level filtering
    if (validatedQuery.userSkillLevel) {
      filteredTutorials = filteredTutorials.filter(
        (t) =>
          t.skillLevel <= validatedQuery.userSkillLevel! + 2 && // Allow tutorials up to 2 levels above
          t.skillLevel >= validatedQuery.userSkillLevel! - 1 // Allow tutorials 1 level below
      )
    }

    // Sorting
    if (validatedQuery.sortBy) {
      const sortField = validatedQuery.sortBy
      const sortOrder = validatedQuery.sortOrder || 'desc'

      filteredTutorials.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case 'created_at':
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
          case 'updated_at':
            aValue = new Date(a.updatedAt).getTime()
            bValue = new Date(b.updatedAt).getTime()
            break
          case 'title':
            aValue = a.title
            bValue = b.title
            break
          case 'duration':
            aValue = a.duration
            bValue = b.duration
            break
          case 'rating':
            aValue = a.averageRating
            bValue = b.averageRating
            break
          case 'views':
            aValue = a.totalViews
            bValue = b.totalViews
            break
          default:
            aValue = 0
            bValue = 0
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      })
    }

    // Pagination
    const totalCount = filteredTutorials.length
    const startIndex = (validatedQuery.page - 1) * validatedQuery.limit
    const paginatedTutorials = filteredTutorials.slice(
      startIndex,
      startIndex + validatedQuery.limit
    )

    // Generate recommendations if enabled and user is authenticated
    let recommendations: VideoTutorial[] = []
    if (validatedQuery.enableRecommendations && userId) {
      // Simple recommendation logic based on incomplete tutorials and context relevance
      recommendations = MOCK_TUTORIALS.filter(
        (t) => !paginatedTutorials.some((pt) => pt.id === t.id)
      )
        .sort((a, b) => {
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
    }

    // TODO: Load user progress if requested
    let userProgress = null
    if (validatedQuery.includeProgress && userId) {
      // Mock progress for demonstration
      userProgress = {
        userId,
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
      }
    }

    const response = {
      tutorials: paginatedTutorials,
      categories: MOCK_CATEGORIES,
      recommendations,
      userProgress,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / validatedQuery.limit),
        hasMore: startIndex + validatedQuery.limit < totalCount,
      },
      meta: {
        searchQuery: validatedQuery.search,
        filters: {
          category: validatedQuery.category,
          difficulty: validatedQuery.difficulty,
          tags: validatedQuery.tags,
          contextFilters: validatedQuery.contextFilters,
        },
        sorting: {
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder,
        },
      },
    }

    logger.info(`[${requestId}] Tutorials retrieved successfully`, {
      tutorialCount: paginatedTutorials.length,
      totalCount,
      recommendationCount: recommendations.length,
    })

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.format(),
      })
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.format(),
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error retrieving tutorials`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/help/tutorials
 * Create or update tutorial progress
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Get user session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized tutorial progress update attempt`)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    logger.info(`[${requestId}] POST /api/help/tutorials`, {
      userId: `${userId.slice(0, 8)}...`,
      tutorialId: body.tutorialId,
    })

    // Validate request body
    const validatedProgress = tutorialProgressSchema.parse(body)

    // TODO: Save tutorial progress to database
    // await saveTutorialProgress(userId, validatedProgress)

    // Mock response for demonstration
    const savedProgress = {
      ...validatedProgress,
      userId,
      updatedAt: new Date().toISOString(),
    }

    logger.info(`[${requestId}] Tutorial progress updated successfully`, {
      tutorialId: validatedProgress.tutorialId,
      watchProgress: validatedProgress.watchProgress,
      completed: validatedProgress.completed,
    })

    return NextResponse.json({
      success: true,
      progress: savedProgress,
      message: 'Tutorial progress updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid tutorial progress data`, {
        errors: error.format(),
      })
      return NextResponse.json(
        {
          error: 'Invalid progress data',
          details: error.format(),
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error updating tutorial progress`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Calculate tutorial relevance score based on user context
 */
function calculateRelevanceScore(
  tutorial: VideoTutorial,
  userContext: {
    workflowState?: string
    currentAction?: string
    skillLevel?: number
  }
): number {
  let score = 0

  // Base relevance from context triggers
  tutorial.contextTriggers.forEach((trigger) => {
    if (userContext.workflowState && trigger.condition === userContext.workflowState) {
      score += trigger.relevanceScore
    }
  })

  // Skill level matching
  if (userContext.skillLevel) {
    const skillDifference = Math.abs(tutorial.skillLevel - userContext.skillLevel)
    score += Math.max(0, 1 - skillDifference * 0.2)
  }

  // Workflow relevance
  tutorial.workflowRelevance.forEach((relevance) => {
    if (userContext.currentAction && relevance.userActions.includes(userContext.currentAction)) {
      score += relevance.relevanceScore
    }
  })

  return score
}

/**
 * Generate personalized tutorial recommendations
 */
function generateRecommendations(
  allTutorials: VideoTutorial[],
  userProgress: any,
  userContext: any,
  limit = 5
): VideoTutorial[] {
  return allTutorials
    .filter((tutorial) => {
      // Exclude completed tutorials
      const progress = userProgress?.tutorialProgress?.[tutorial.id]
      return !progress?.completed
    })
    .map((tutorial) => ({
      ...tutorial,
      relevanceScore: calculateRelevanceScore(tutorial, userContext),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

export type { VideoTutorial, TutorialCategory, UserProgress, TutorialProgress }
