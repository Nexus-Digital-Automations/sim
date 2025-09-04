/**
 * Interactive Guides API - RESTful endpoints for guide management
 * 
 * Features:
 * - Interactive guide CRUD operations
 * - Step-by-step progress tracking
 * - Context-aware guide recommendations
 * - Real-time validation and assistance
 * - Branching guide paths management
 * - User interaction analytics
 * 
 * @created 2025-01-04
 * @author Video Tutorials & Interactive Guides Specialist
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('GuidesAPI')

// ========================
// VALIDATION SCHEMAS
// ========================

const guideQuerySchema = z.object({
  // Filtering
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  contextType: z.string().optional(),
  
  // Context matching
  workflowState: z.string().optional(),
  userAction: z.string().optional(),
  errorCondition: z.string().optional(),
  
  // Search and discovery
  search: z.string().optional(),
  
  // Pagination
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 50)),
  
  // Options
  includeSteps: z.string().transform(val => val === 'true').optional(),
  enableRecommendations: z.string().transform(val => val === 'true').optional(),
})

const guideProgressSchema = z.object({
  guideId: z.string(),
  currentStepId: z.string(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()).optional(),
  branchPath: z.array(z.string()).optional(),
  isCompleted: z.boolean().optional(),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
})

const stepValidationSchema = z.object({
  guideId: z.string(),
  stepId: z.string(),
  validationType: z.enum(['element_exists', 'workflow_state', 'user_action', 'custom']),
  validationData: z.record(z.any()).optional(),
})

// ========================
// TYPES
// ========================

interface InteractiveGuide {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  steps: GuideStep[]
  branches: GuideBranch[]
  prerequisites: string[]
  objectives: string[]
  contextTriggers: ContextTrigger[]
  workflowStates: WorkflowStateCondition[]
  relatedTutorials: string[]
  helpLinks: HelpLink[]
  author: string
  version: string
  createdAt: string
  updatedAt: string
}

interface GuideStep {
  id: string
  title: string
  description: string
  content: string
  type: 'instruction' | 'action' | 'validation' | 'decision' | 'information'
  isOptional: boolean
  canSkip: boolean
  targetElement?: string
  highlightType: 'none' | 'outline' | 'spotlight' | 'overlay'
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  nextStepId?: string
  conditions: StepCondition[]
  media: MediaContent[]
  hints: string[]
  troubleshooting: TroubleshootingTip[]
  validationRules: ValidationRule[]
  successCriteria: string[]
  errorHandling: ErrorHandling[]
}

interface GuideBranch {
  id: string
  name: string
  condition: string
  description: string
  steps: string[]
  rejoinsAt?: string
}

interface StepCondition {
  type: 'user_action' | 'workflow_state' | 'element_exists' | 'custom_validation'
  condition: string
  value?: any
  message?: string
}

interface MediaContent {
  id: string
  type: 'image' | 'video' | 'gif' | 'diagram'
  url: string
  alt: string
  caption?: string
}

interface TroubleshootingTip {
  problem: string
  solution: string
  additionalHelp?: string
}

interface ValidationRule {
  type: 'workflow_validation' | 'element_validation' | 'state_validation'
  rule: string
  errorMessage: string
  successMessage: string
}

interface ErrorHandling {
  errorType: string
  message: string
  suggestedAction: string
  recoverySteps: string[]
}

interface HelpLink {
  title: string
  url: string
  type: 'documentation' | 'tutorial' | 'community' | 'support'
}

interface ContextTrigger {
  type: 'workflow_state' | 'user_action' | 'error_condition' | 'help_request'
  condition: string
  priority: number
}

interface WorkflowStateCondition {
  state: string
  condition: string
  relevanceScore: number
}

interface GuideProgress {
  guideId: string
  currentStepId: string
  completedSteps: string[]
  skippedSteps: string[]
  startedAt: string
  lastActivity: string
  completionPercent: number
  totalTimeSpent: number
  branchPath: string[]
  isCompleted: boolean
  rating?: number
  feedback?: string
}

// ========================
// MOCK DATA - TO BE REPLACED WITH DATABASE
// ========================

const MOCK_GUIDES: Record<string, InteractiveGuide> = {
  'create-first-workflow': {
    id: 'create-first-workflow',
    title: 'Create Your First Workflow',
    description: 'Step-by-step guide to building your first automation workflow',
    category: 'getting-started',
    difficulty: 'beginner',
    estimatedTime: 300,
    steps: [
      {
        id: 'step-1',
        title: 'Open Workflow Editor',
        description: 'Navigate to the workflow creation area',
        content: 'Click the "Create Workflow" button to open the editor',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="create-workflow-button"]',
        highlightType: 'spotlight',
        position: 'bottom',
        nextStepId: 'step-2',
        conditions: [
          {
            type: 'element_exists',
            condition: '[data-testid="workflow-editor"]',
            message: 'Workflow editor should be visible'
          }
        ],
        media: [
          {
            id: 'step-1-image',
            type: 'image',
            url: '/guides/images/create-workflow-button.png',
            alt: 'Create workflow button location'
          }
        ],
        hints: [
          'Look for the blue "Create Workflow" button in the main navigation',
          'If you don\'t see the button, try refreshing the page'
        ],
        troubleshooting: [
          {
            problem: 'Create Workflow button is not visible',
            solution: 'Make sure you are logged in and have the necessary permissions',
            additionalHelp: 'Contact support if the problem persists'
          }
        ],
        validationRules: [
          {
            type: 'element_validation',
            rule: 'editor-opened',
            errorMessage: 'Workflow editor did not open properly',
            successMessage: 'Great! The workflow editor is now open'
          }
        ],
        successCriteria: ['Workflow editor is visible and accessible'],
        errorHandling: [
          {
            errorType: 'navigation_error',
            message: 'Unable to open workflow editor',
            suggestedAction: 'Try refreshing the page',
            recoverySteps: [
              'Refresh the browser page',
              'Clear browser cache if needed',
              'Contact support'
            ]
          }
        ]
      },
      {
        id: 'step-2',
        title: 'Add Starter Block',
        description: 'Every workflow needs a starting point',
        content: 'Drag a starter block from the block library to the canvas',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="block-library"]',
        highlightType: 'outline',
        position: 'right',
        nextStepId: 'step-3',
        conditions: [
          {
            type: 'workflow_state',
            condition: 'blocks.length > 0',
            message: 'At least one block should be added'
          }
        ],
        media: [],
        hints: [
          'Look for the starter block in the "Core" category',
          'You can drag and drop or click to add blocks'
        ],
        troubleshooting: [
          {
            problem: 'Cannot find the starter block',
            solution: 'Use the search box in the block library to find "starter"'
          }
        ],
        validationRules: [
          {
            type: 'workflow_validation',
            rule: 'has-starter-block',
            errorMessage: 'Starter block was not added to the workflow',
            successMessage: 'Perfect! You\'ve added your first block'
          }
        ],
        successCriteria: ['Starter block is present in the workflow canvas'],
        errorHandling: []
      },
      {
        id: 'step-3',
        title: 'Configure Your Block',
        description: 'Set up the starter block with your preferences',
        content: 'Click on the starter block and configure its settings in the properties panel',
        type: 'action',
        isOptional: false,
        canSkip: true,
        targetElement: '[data-testid="starter-block"]',
        highlightType: 'outline',
        position: 'right',
        conditions: [
          {
            type: 'user_action',
            condition: 'block_configured',
            message: 'Block should be properly configured'
          }
        ],
        media: [],
        hints: [
          'Click on the block to select it',
          'The properties panel will appear on the right side'
        ],
        troubleshooting: [
          {
            problem: 'Properties panel is not visible',
            solution: 'Make sure the block is selected (it should have a blue outline)'
          }
        ],
        validationRules: [
          {
            type: 'state_validation',
            rule: 'block-configured',
            errorMessage: 'Block configuration is incomplete',
            successMessage: 'Excellent! Your block is now configured'
          }
        ],
        successCriteria: ['Block properties have been reviewed and configured'],
        errorHandling: []
      }
    ],
    branches: [
      {
        id: 'advanced-config',
        name: 'Advanced Configuration',
        condition: 'user.experience === "advanced"',
        description: 'Additional configuration steps for advanced users',
        steps: ['step-advanced-1', 'step-advanced-2'],
        rejoinsAt: 'step-4'
      }
    ],
    prerequisites: [],
    objectives: [
      'Learn to navigate the workflow editor',
      'Add your first workflow block',
      'Understand basic workflow concepts',
      'Configure block properties'
    ],
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'empty_canvas',
        priority: 1
      },
      {
        type: 'user_action',
        condition: 'first_visit',
        priority: 2
      }
    ],
    workflowStates: [
      {
        state: 'empty',
        condition: 'blocks.length === 0',
        relevanceScore: 1.0
      }
    ],
    relatedTutorials: ['tutorial-1'],
    helpLinks: [
      {
        title: 'Workflow Basics Documentation',
        url: '/docs/workflows/basics',
        type: 'documentation'
      },
      {
        title: 'Block Library Reference',
        url: '/docs/blocks',
        type: 'documentation'
      }
    ],
    author: 'Sim Learning Team',
    version: '1.0',
    createdAt: '2025-01-04T10:00:00Z',
    updatedAt: '2025-01-04T10:00:00Z'
  },
  'api-integration-guide': {
    id: 'api-integration-guide',
    title: 'API Integration Workflow',
    description: 'Learn to connect external APIs with your workflows',
    category: 'integrations',
    difficulty: 'intermediate',
    estimatedTime: 600,
    steps: [
      {
        id: 'api-step-1',
        title: 'Add API Block',
        description: 'Add an API block to make external requests',
        content: 'Drag an API block from the integrations category to your workflow',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="api-block"]',
        highlightType: 'spotlight',
        position: 'center',
        nextStepId: 'api-step-2',
        conditions: [],
        media: [],
        hints: ['API blocks are in the "Integrations" category'],
        troubleshooting: [],
        validationRules: [],
        successCriteria: ['API block is added to the workflow'],
        errorHandling: []
      },
      {
        id: 'api-step-2',
        title: 'Configure API Endpoint',
        description: 'Set up the API URL and method',
        content: 'Enter the API endpoint URL and select the HTTP method (GET, POST, etc.)',
        type: 'action',
        isOptional: false,
        canSkip: false,
        targetElement: '[data-testid="api-config"]',
        highlightType: 'outline',
        position: 'right',
        conditions: [],
        media: [],
        hints: [
          'Make sure to include the full URL including https://',
          'Choose the correct HTTP method for your API'
        ],
        troubleshooting: [
          {
            problem: 'API endpoint returns an error',
            solution: 'Check that the URL is correct and the API is accessible'
          }
        ],
        validationRules: [],
        successCriteria: ['API endpoint URL is configured', 'HTTP method is selected'],
        errorHandling: []
      }
    ],
    branches: [],
    prerequisites: ['create-first-workflow'],
    objectives: [
      'Learn to add API blocks to workflows',
      'Configure API endpoints and methods',
      'Handle API responses and errors'
    ],
    contextTriggers: [
      {
        type: 'workflow_state',
        condition: 'has_basic_workflow',
        priority: 1
      },
      {
        type: 'user_action',
        condition: 'add_api_block',
        priority: 2
      }
    ],
    workflowStates: [
      {
        state: 'needs_api',
        condition: 'workflow.needsExternalData',
        relevanceScore: 0.9
      }
    ],
    relatedTutorials: ['tutorial-2'],
    helpLinks: [
      {
        title: 'API Block Documentation',
        url: '/docs/blocks/api',
        type: 'documentation'
      }
    ],
    author: 'Sim Integration Team',
    version: '1.1',
    createdAt: '2025-01-04T12:00:00Z',
    updatedAt: '2025-01-04T12:00:00Z'
  }
}

// ========================
// API HANDLERS
// ========================

/**
 * GET /api/help/guides
 * Retrieve interactive guides with filtering and recommendations
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
    
    logger.info(`[${requestId}] GET /api/help/guides`, {
      userId: userId ? `${userId.slice(0, 8)}...` : 'anonymous',
      queryParams
    })
    
    const validatedQuery = guideQuerySchema.parse(queryParams)
    
    // Get all guides
    let guides = Object.values(MOCK_GUIDES)
    
    // Apply filtering
    if (validatedQuery.category) {
      guides = guides.filter(g => g.category === validatedQuery.category)
    }
    
    if (validatedQuery.difficulty) {
      guides = guides.filter(g => g.difficulty === validatedQuery.difficulty)
    }
    
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase()
      guides = guides.filter(g =>
        g.title.toLowerCase().includes(searchTerm) ||
        g.description.toLowerCase().includes(searchTerm) ||
        g.objectives.some(obj => obj.toLowerCase().includes(searchTerm))
      )
    }
    
    // Context-based filtering
    if (validatedQuery.workflowState || validatedQuery.userAction || validatedQuery.errorCondition) {
      guides = guides.filter(guide => {
        return guide.contextTriggers.some(trigger => {
          if (validatedQuery.workflowState && trigger.condition === validatedQuery.workflowState) return true
          if (validatedQuery.userAction && trigger.condition === validatedQuery.userAction) return true
          if (validatedQuery.errorCondition && trigger.condition === validatedQuery.errorCondition) return true
          return false
        })
      })
    }
    
    // Remove steps if not requested (for performance)
    if (!validatedQuery.includeSteps) {
      guides = guides.map(guide => ({
        ...guide,
        steps: guide.steps.map(step => ({
          id: step.id,
          title: step.title,
          description: step.description,
          type: step.type,
          isOptional: step.isOptional,
          canSkip: step.canSkip
        })) as GuideStep[]
      }))
    }
    
    // Pagination
    const totalCount = guides.length
    const startIndex = (validatedQuery.page - 1) * validatedQuery.limit
    const paginatedGuides = guides.slice(startIndex, startIndex + validatedQuery.limit)
    
    // Generate recommendations if enabled
    let recommendations: InteractiveGuide[] = []
    if (validatedQuery.enableRecommendations && userId) {
      recommendations = generateGuideRecommendations(
        Object.values(MOCK_GUIDES),
        {
          workflowState: validatedQuery.workflowState,
          userAction: validatedQuery.userAction,
          errorCondition: validatedQuery.errorCondition
        },
        3
      ).filter(rec => !paginatedGuides.some(pg => pg.id === rec.id))
    }
    
    const response = {
      guides: paginatedGuides,
      recommendations,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / validatedQuery.limit),
        hasMore: startIndex + validatedQuery.limit < totalCount
      },
      meta: {
        includeSteps: validatedQuery.includeSteps,
        filters: {
          category: validatedQuery.category,
          difficulty: validatedQuery.difficulty,
          contextType: validatedQuery.contextType
        },
        context: {
          workflowState: validatedQuery.workflowState,
          userAction: validatedQuery.userAction,
          errorCondition: validatedQuery.errorCondition
        }
      }
    }
    
    logger.info(`[${requestId}] Guides retrieved successfully`, {
      guideCount: paginatedGuides.length,
      totalCount,
      recommendationCount: recommendations.length
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid query parameters`, {
        errors: error.format()
      })
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.format()
        },
        { status: 400 }
      )
    }
    
    logger.error(`[${requestId}] Error retrieving guides`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/help/guides
 * Update guide progress or validate step completion
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    // Get user session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized guide progress update attempt`)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const userId = session.user.id
    const body = await request.json()
    
    logger.info(`[${requestId}] POST /api/help/guides`, {
      userId: `${userId.slice(0, 8)}...`,
      action: body.action || 'update_progress',
      guideId: body.guideId
    })
    
    // Handle different actions
    if (body.action === 'validate_step') {
      return await handleStepValidation(requestId, body, userId)
    } else {
      return await handleProgressUpdate(requestId, body, userId)
    }
    
  } catch (error) {
    logger.error(`[${requestId}] Error processing guide request`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Handle guide progress update
 */
async function handleProgressUpdate(requestId: string, body: any, userId: string) {
  try {
    // Validate progress data
    const validatedProgress = guideProgressSchema.parse(body)
    
    // TODO: Save guide progress to database
    // await saveGuideProgress(userId, validatedProgress)
    
    // Mock response for demonstration
    const savedProgress = {
      ...validatedProgress,
      userId,
      lastActivity: new Date().toISOString(),
      completionPercent: (validatedProgress.completedSteps.length / getGuideStepCount(validatedProgress.guideId)) * 100
    }
    
    logger.info(`[${requestId}] Guide progress updated successfully`, {
      guideId: validatedProgress.guideId,
      currentStep: validatedProgress.currentStepId,
      completedSteps: validatedProgress.completedSteps.length,
      isCompleted: validatedProgress.isCompleted
    })
    
    return NextResponse.json({
      success: true,
      progress: savedProgress,
      message: 'Guide progress updated successfully'
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid guide progress data`, {
        errors: error.format()
      })
      return NextResponse.json(
        {
          error: 'Invalid progress data',
          details: error.format()
        },
        { status: 400 }
      )
    }
    throw error
  }
}

/**
 * Handle step validation
 */
async function handleStepValidation(requestId: string, body: any, userId: string) {
  try {
    // Validate validation request
    const validatedRequest = stepValidationSchema.parse(body)
    
    // Get the guide and step
    const guide = MOCK_GUIDES[validatedRequest.guideId]
    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      )
    }
    
    const step = guide.steps.find(s => s.id === validatedRequest.stepId)
    if (!step) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }
    
    // Perform validation based on type
    let validationResult = { isValid: false, message: '', suggestions: [] as string[] }
    
    switch (validatedRequest.validationType) {
      case 'element_exists':
        // Mock element existence validation
        validationResult = await validateElementExists(validatedRequest, step)
        break
      case 'workflow_state':
        // Mock workflow state validation
        validationResult = await validateWorkflowState(validatedRequest, step)
        break
      case 'user_action':
        // Mock user action validation
        validationResult = await validateUserAction(validatedRequest, step)
        break
      case 'custom':
        // Mock custom validation
        validationResult = await validateCustomCondition(validatedRequest, step)
        break
    }
    
    logger.info(`[${requestId}] Step validation completed`, {
      guideId: validatedRequest.guideId,
      stepId: validatedRequest.stepId,
      validationType: validatedRequest.validationType,
      isValid: validationResult.isValid
    })
    
    return NextResponse.json({
      success: true,
      validation: {
        ...validationResult,
        stepId: validatedRequest.stepId,
        guideId: validatedRequest.guideId,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid step validation data`, {
        errors: error.format()
      })
      return NextResponse.json(
        {
          error: 'Invalid validation data',
          details: error.format()
        },
        { status: 400 }
      )
    }
    throw error
  }
}

/**
 * Mock validation functions (to be replaced with real implementations)
 */
async function validateElementExists(request: any, step: GuideStep) {
  // Mock implementation - always return true for demo
  return {
    isValid: true,
    message: 'Element found successfully',
    suggestions: []
  }
}

async function validateWorkflowState(request: any, step: GuideStep) {
  // Mock implementation - check if workflow has expected state
  return {
    isValid: true,
    message: 'Workflow state is correct',
    suggestions: []
  }
}

async function validateUserAction(request: any, step: GuideStep) {
  // Mock implementation - verify user completed the action
  return {
    isValid: true,
    message: 'User action completed successfully',
    suggestions: []
  }
}

async function validateCustomCondition(request: any, step: GuideStep) {
  // Mock implementation - custom validation logic
  return {
    isValid: true,
    message: 'Custom validation passed',
    suggestions: []
  }
}

/**
 * Generate guide recommendations based on context
 */
function generateGuideRecommendations(
  allGuides: InteractiveGuide[],
  context: {
    workflowState?: string
    userAction?: string
    errorCondition?: string
  },
  limit: number = 3
): InteractiveGuide[] {
  return allGuides
    .map(guide => ({
      ...guide,
      relevanceScore: calculateGuideRelevance(guide, context)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}

/**
 * Calculate guide relevance score based on context
 */
function calculateGuideRelevance(
  guide: InteractiveGuide,
  context: {
    workflowState?: string
    userAction?: string
    errorCondition?: string
  }
): number {
  let score = 0
  
  // Check context triggers
  guide.contextTriggers.forEach(trigger => {
    if (context.workflowState && trigger.condition === context.workflowState) {
      score += trigger.priority
    }
    if (context.userAction && trigger.condition === context.userAction) {
      score += trigger.priority
    }
    if (context.errorCondition && trigger.condition === context.errorCondition) {
      score += trigger.priority * 1.5 // Error conditions have higher priority
    }
  })
  
  // Check workflow states
  guide.workflowStates.forEach(state => {
    if (context.workflowState === state.state) {
      score += state.relevanceScore
    }
  })
  
  return score
}

/**
 * Get the number of steps in a guide
 */
function getGuideStepCount(guideId: string): number {
  const guide = MOCK_GUIDES[guideId]
  return guide ? guide.steps.length : 0
}

export type {
  InteractiveGuide,
  GuideStep,
  GuideProgress,
  ContextTrigger,
  WorkflowStateCondition
}