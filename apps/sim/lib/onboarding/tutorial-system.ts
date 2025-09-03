/**
 * Tutorial System - Core infrastructure for managing interactive tutorials and onboarding
 *
 * This system provides:
 * - Progressive tutorial management with step-by-step guidance
 * - Context-aware hint system and help suggestions
 * - Achievement-based learning progression
 * - User progress tracking and analytics
 * - Integration with accessibility features
 *
 * @created 2025-09-03
 * @author Claude Development System
 */

import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('TutorialSystem')

export interface TutorialStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for element to highlight
  content: string | React.ReactNode
  action?: 'highlight' | 'click' | 'input' | 'drag' | 'wait' | 'custom'
  validation?: string | (() => boolean)
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  offset?: { x: number; y: number }
  optional?: boolean
  skipable?: boolean
  hints?: string[]
  nextStepDelay?: number
  customComponent?: React.ComponentType<any>
  accessibilityInstructions?: string
  keyboardShortcuts?: string[]
  screenReaderText?: string
}

export interface Tutorial {
  id: string
  title: string
  description: string
  category: 'basic' | 'intermediate' | 'advanced' | 'feature-specific'
  estimatedDuration: number // minutes
  prerequisites?: string[]
  steps: TutorialStep[]
  completionRewards?: {
    badges?: string[]
    unlockFeatures?: string[]
    nextRecommendations?: string[]
  }
  metadata: {
    version: string
    created: Date
    updated: Date
    author: string
    difficulty: 1 | 2 | 3 | 4 | 5
    popularity: number
    completionRate: number
  }
}

export interface TutorialSession {
  id: string
  tutorialId: string
  userId: string
  startedAt: Date
  completedAt?: Date
  currentStepIndex: number
  completedSteps: string[]
  skippedSteps: string[]
  hintsUsed: number
  timeSpent: number // milliseconds
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  context: Record<string, any>
  userDifficulty: 'beginner' | 'intermediate' | 'advanced'
  accessibilityMode?: boolean
  keyboardNavigation?: boolean
}

export interface TutorialContext {
  workspaceId?: string
  workflowId?: string
  currentPage: string
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  completedTutorials: string[]
  userPreferences: {
    autoAdvance: boolean
    showHints: boolean
    playAudio: boolean
    highContrast: boolean
    reducedMotion: boolean
  }
  sessionData: Record<string, any>
}

export interface Hint {
  id: string
  type: 'tip' | 'warning' | 'info' | 'success' | 'keyboard'
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  triggers: string[]
  conditions?: Record<string, any>
  accessibilityText?: string
}

export interface CompletionResult {
  success: boolean
  score: number // 0-100
  timeSpent: number
  hintsUsed: number
  skippedSteps: number
  achievements: string[]
  nextRecommendations: Tutorial[]
  feedback?: string
}

export interface TutorialProgress {
  userId: string
  totalTutorialsCompleted: number
  totalTimeSpent: number
  averageScore: number
  achievements: string[]
  currentLevel: 'beginner' | 'intermediate' | 'advanced'
  preferences: TutorialContext['userPreferences']
  weakAreas: string[]
  recommendedTutorials: string[]
  lastActivity: Date
}

/**
 * Core Tutorial System Class
 *
 * Manages tutorial lifecycle, progress tracking, and user interactions
 * with comprehensive accessibility support and analytics integration.
 */
export class TutorialSystem {
  private sessions = new Map<string, TutorialSession>()
  private tutorials = new Map<string, Tutorial>()
  private userProgress = new Map<string, TutorialProgress>()
  private activeSession: TutorialSession | null = null
  private eventHandlers = new Map<string, Function[]>()
  private accessibilityMode = false
  private keyboardNavigation = false

  constructor(options?: {
    accessibilityMode?: boolean
    keyboardNavigation?: boolean
    enableAnalytics?: boolean
  }) {
    logger.info('Initializing Tutorial System', {
      accessibilityMode: options?.accessibilityMode || false,
      keyboardNavigation: options?.keyboardNavigation || false,
      enableAnalytics: options?.enableAnalytics || true,
    })

    this.accessibilityMode = options?.accessibilityMode || false
    this.keyboardNavigation = options?.keyboardNavigation || false

    // Initialize event listeners for accessibility
    if (this.keyboardNavigation) {
      this.setupKeyboardNavigation()
    }

    // Load stored progress and tutorials
    this.loadStoredData()
  }

  /**
   * Start a new tutorial session with comprehensive accessibility support
   */
  async startTutorial(
    tutorialId: string,
    userId: string,
    context?: Partial<TutorialContext>
  ): Promise<TutorialSession> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Starting tutorial session`, {
      tutorialId,
      userId,
      context,
      accessibilityMode: this.accessibilityMode,
      timestamp: new Date().toISOString(),
    })

    try {
      // Validate tutorial exists
      const tutorial = this.tutorials.get(tutorialId)
      if (!tutorial) {
        const error = new Error(`Tutorial not found: ${tutorialId}`)
        logger.error(`[${operationId}] Tutorial not found`, {
          tutorialId,
          userId,
          error: error.message,
        })
        throw error
      }

      // Check prerequisites
      const userProgress = this.userProgress.get(userId)
      if (tutorial.prerequisites && userProgress) {
        const missingPrerequisites = tutorial.prerequisites.filter(
          (prereq) => !userProgress.completedTutorials.includes(prereq)
        )
        if (missingPrerequisites.length > 0) {
          const error = new Error(`Missing prerequisites: ${missingPrerequisites.join(', ')}`)
          logger.warn(`[${operationId}] Prerequisites not met`, {
            tutorialId,
            userId,
            missingPrerequisites,
          })
          throw error
        }
      }

      // Create session
      const session: TutorialSession = {
        id: nanoid(),
        tutorialId,
        userId,
        startedAt: new Date(),
        currentStepIndex: 0,
        completedSteps: [],
        skippedSteps: [],
        hintsUsed: 0,
        timeSpent: 0,
        status: 'active',
        context: {
          currentPage: window.location.pathname,
          userLevel: userProgress?.currentLevel || 'beginner',
          completedTutorials: userProgress?.completedTutorials || [],
          userPreferences: userProgress?.preferences || {
            autoAdvance: false,
            showHints: true,
            playAudio: false,
            highContrast: false,
            reducedMotion: false,
          },
          sessionData: {},
          ...context,
        },
        userDifficulty: userProgress?.currentLevel || 'beginner',
        accessibilityMode: this.accessibilityMode,
        keyboardNavigation: this.keyboardNavigation,
      }

      // Store session
      this.sessions.set(session.id, session)
      this.activeSession = session

      // Initialize tutorial UI
      await this.initializeTutorialUI(session)

      // Emit start event
      this.emit('tutorialStarted', { session, tutorial })

      // Announce to screen readers if in accessibility mode
      if (this.accessibilityMode) {
        this.announceToScreenReader(`Tutorial started: ${tutorial.title}. ${tutorial.description}`)
      }

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Tutorial session started successfully`, {
        sessionId: session.id,
        tutorialId,
        userId,
        processingTimeMs: processingTime,
      })

      return session
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to start tutorial session`, {
        tutorialId,
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  /**
   * Track user progress through tutorial steps with accessibility announcements
   */
  async trackProgress(
    sessionId: string,
    stepId: string,
    data?: Record<string, any>
  ): Promise<void> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Tracking tutorial progress`, {
      sessionId,
      stepId,
      data,
      timestamp: new Date().toISOString(),
    })

    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const tutorial = this.tutorials.get(session.tutorialId)
      if (!tutorial) {
        throw new Error(`Tutorial not found: ${session.tutorialId}`)
      }

      const currentStep = tutorial.steps[session.currentStepIndex]
      if (!currentStep || currentStep.id !== stepId) {
        throw new Error(`Step mismatch: expected ${currentStep?.id}, got ${stepId}`)
      }

      // Validate step completion if validation exists
      if (currentStep.validation) {
        const isValid =
          typeof currentStep.validation === 'string'
            ? this.validateStepBySelector(currentStep.validation)
            : currentStep.validation()

        if (!isValid) {
          logger.warn(`[${operationId}] Step validation failed`, {
            sessionId,
            stepId,
            validationType: typeof currentStep.validation,
          })

          // Provide hint if validation fails
          const hint = await this.provideTutorialHint(sessionId, {
            currentStep: currentStep,
            validationFailed: true,
          })

          this.emit('stepValidationFailed', { session, step: currentStep, hint })
          return
        }
      }

      // Mark step as completed
      session.completedSteps.push(stepId)
      session.currentStepIndex += 1
      session.timeSpent = Date.now() - session.startedAt.getTime()

      // Update session context
      if (data) {
        session.context.sessionData = { ...session.context.sessionData, ...data }
      }

      // Check if tutorial is complete
      if (session.currentStepIndex >= tutorial.steps.length) {
        await this.completeTutorial(sessionId)
        return
      }

      // Move to next step
      const nextStep = tutorial.steps[session.currentStepIndex]
      await this.showStep(session, nextStep)

      // Announce progress to screen readers
      if (this.accessibilityMode) {
        const progress = Math.round((session.currentStepIndex / tutorial.steps.length) * 100)
        this.announceToScreenReader(
          `Step completed. Progress: ${progress}%. ${nextStep.screenReaderText || nextStep.title}`
        )
      }

      this.emit('progressTracked', { session, completedStep: currentStep, nextStep })

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Tutorial progress tracked successfully`, {
        sessionId,
        stepId,
        nextStepId: nextStep?.id,
        progress: `${session.currentStepIndex}/${tutorial.steps.length}`,
        processingTimeMs: processingTime,
      })
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to track tutorial progress`, {
        sessionId,
        stepId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  /**
   * Provide contextual hints with accessibility support
   */
  async provideTutorialHint(sessionId: string, context: any): Promise<Hint> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Providing tutorial hint`, {
      sessionId,
      context: Object.keys(context),
      timestamp: new Date().toISOString(),
    })

    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const tutorial = this.tutorials.get(session.tutorialId)
      if (!tutorial) {
        throw new Error(`Tutorial not found: ${session.tutorialId}`)
      }

      const currentStep = tutorial.steps[session.currentStepIndex]
      if (!currentStep) {
        throw new Error(`No current step found for session ${sessionId}`)
      }

      // Generate contextual hint based on current step and context
      let hint: Hint

      if (context.validationFailed) {
        // Provide validation failure hint
        hint = {
          id: nanoid(),
          type: 'warning',
          title: 'Step Validation Required',
          content: this.generateValidationHint(currentStep, context),
          priority: 'high',
          triggers: ['validation-failed'],
          accessibilityText: `Validation failed for ${currentStep.title}. ${this.generateValidationHint(currentStep, context)}`,
        }
      } else if (context.userStuck) {
        // Provide help for stuck users
        hint = {
          id: nanoid(),
          type: 'tip',
          title: 'Need Help?',
          content: this.generateStuckUserHint(currentStep, session),
          priority: 'medium',
          triggers: ['user-stuck'],
          accessibilityText: `Hint for ${currentStep.title}: ${this.generateStuckUserHint(currentStep, session)}`,
        }
      } else {
        // Provide general step hint
        const availableHints = currentStep.hints || ['Click on the highlighted element to continue']
        const hintIndex = session.hintsUsed % availableHints.length

        hint = {
          id: nanoid(),
          type: 'info',
          title: 'Tutorial Tip',
          content: availableHints[hintIndex],
          priority: 'medium',
          triggers: ['general-hint'],
          accessibilityText: `Tip: ${availableHints[hintIndex]}`,
        }
      }

      // Track hint usage
      session.hintsUsed += 1

      // Announce hint to screen readers
      if (this.accessibilityMode && hint.accessibilityText) {
        this.announceToScreenReader(hint.accessibilityText)
      }

      this.emit('hintProvided', { session, hint, context })

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Tutorial hint provided successfully`, {
        sessionId,
        hintId: hint.id,
        hintType: hint.type,
        priority: hint.priority,
        processingTimeMs: processingTime,
      })

      return hint
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to provide tutorial hint`, {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })

      // Return fallback hint
      return {
        id: nanoid(),
        type: 'info',
        title: 'General Help',
        content: 'If you need help, you can skip this step or return to the tutorial menu.',
        priority: 'low',
        triggers: ['fallback'],
      }
    }
  }

  /**
   * Complete tutorial with comprehensive result analysis
   */
  async completeTutorial(sessionId: string): Promise<CompletionResult> {
    const operationId = nanoid()
    const startTime = Date.now()

    logger.info(`[${operationId}] Completing tutorial session`, {
      sessionId,
      timestamp: new Date().toISOString(),
    })

    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`)
      }

      const tutorial = this.tutorials.get(session.tutorialId)
      if (!tutorial) {
        throw new Error(`Tutorial not found: ${session.tutorialId}`)
      }

      // Calculate completion metrics
      const completionTime = Date.now() - session.startedAt.getTime()
      const completedStepsCount = session.completedSteps.length
      const totalStepsCount = tutorial.steps.length
      const completionRate = completedStepsCount / totalStepsCount

      // Calculate score (0-100 based on completion rate, speed, and hints used)
      const baseScore = completionRate * 100
      const speedBonus = Math.max(0, 20 - completionTime / (1000 * 60)) // Bonus for completing under 20 minutes
      const hintPenalty = Math.min(20, session.hintsUsed * 2) // Penalty for using too many hints
      const skipPenalty = session.skippedSteps.length * 5 // Penalty for skipping steps

      const finalScore = Math.max(
        0,
        Math.min(100, baseScore + speedBonus - hintPenalty - skipPenalty)
      )

      // Determine achievements
      const achievements: string[] = []
      if (completionRate === 1) achievements.push('tutorial-completionist')
      if (session.hintsUsed === 0) achievements.push('tutorial-independent')
      if (completionTime < tutorial.estimatedDuration * 60 * 1000)
        achievements.push('tutorial-speedster')
      if (session.skippedSteps.length === 0) achievements.push('tutorial-thorough')

      // Update session
      session.status = 'completed'
      session.completedAt = new Date()
      session.timeSpent = completionTime

      // Update user progress
      await this.updateUserProgress(session.userId, {
        tutorialId: tutorial.id,
        score: finalScore,
        timeSpent: completionTime,
        achievements,
      })

      // Generate next recommendations
      const nextRecommendations = await this.getRecommendedTutorials(session.userId, tutorial)

      const result: CompletionResult = {
        success: true,
        score: Math.round(finalScore),
        timeSpent: completionTime,
        hintsUsed: session.hintsUsed,
        skippedSteps: session.skippedSteps.length,
        achievements,
        nextRecommendations,
        feedback: this.generateCompletionFeedback(finalScore, session, tutorial),
      }

      // Cleanup session
      this.activeSession = null
      await this.cleanupTutorialUI(session)

      // Announce completion to screen readers
      if (this.accessibilityMode) {
        this.announceToScreenReader(
          `Tutorial completed: ${tutorial.title}. Score: ${Math.round(finalScore)}%. ${achievements.length} achievements earned.`
        )
      }

      this.emit('tutorialCompleted', { session, result, tutorial })

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Tutorial completed successfully`, {
        sessionId,
        tutorialId: session.tutorialId,
        userId: session.userId,
        score: Math.round(finalScore),
        completionRate: Math.round(completionRate * 100),
        achievements: achievements.length,
        processingTimeMs: processingTime,
      })

      return result
    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to complete tutorial`, {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      })
      throw error
    }
  }

  // Helper methods for internal operations

  private async initializeTutorialUI(session: TutorialSession): Promise<void> {
    // Initialize tutorial overlay, highlighting, and accessibility features
    logger.info('Initializing tutorial UI', { sessionId: session.id })

    // Setup accessibility features if enabled
    if (this.accessibilityMode) {
      this.setupAccessibilityFeatures()
    }
  }

  private async showStep(session: TutorialSession, step: TutorialStep): Promise<void> {
    logger.info('Showing tutorial step', {
      sessionId: session.id,
      stepId: step.id,
      stepTitle: step.title,
    })

    // Implementation would show step overlay, highlight target element, etc.
    this.emit('stepShown', { session, step })
  }

  private async cleanupTutorialUI(session: TutorialSession): Promise<void> {
    logger.info('Cleaning up tutorial UI', { sessionId: session.id })
    // Remove tutorial overlays and restore normal interface
  }

  private validateStepBySelector(selector: string): boolean {
    try {
      const element = document.querySelector(selector)
      return element !== null
    } catch {
      return false
    }
  }

  private generateValidationHint(step: TutorialStep, context: any): string {
    return `Please complete the required action for "${step.title}". Look for the highlighted element and follow the instructions.`
  }

  private generateStuckUserHint(step: TutorialStep, session: TutorialSession): string {
    const hints = step.hints || []
    if (hints.length > 0) {
      return hints[session.hintsUsed % hints.length]
    }
    return `Try ${step.action || 'interacting with'} the highlighted element. You can also skip this step if needed.`
  }

  private generateCompletionFeedback(
    score: number,
    session: TutorialSession,
    tutorial: Tutorial
  ): string {
    if (score >= 90)
      return `Excellent work! You mastered ${tutorial.title} with outstanding performance.`
    if (score >= 70) return `Great job! You completed ${tutorial.title} successfully.`
    if (score >= 50)
      return `Good effort! You finished ${tutorial.title}. Consider reviewing the steps you found challenging.`
    return `You completed ${tutorial.title}. Review the tutorial content and try practicing the skills you learned.`
  }

  private async updateUserProgress(
    userId: string,
    data: {
      tutorialId: string
      score: number
      timeSpent: number
      achievements: string[]
    }
  ): Promise<void> {
    // Update user progress tracking
    const progress = this.userProgress.get(userId) || {
      userId,
      totalTutorialsCompleted: 0,
      totalTimeSpent: 0,
      averageScore: 0,
      achievements: [],
      currentLevel: 'beginner' as const,
      preferences: {
        autoAdvance: false,
        showHints: true,
        playAudio: false,
        highContrast: false,
        reducedMotion: false,
      },
      weakAreas: [],
      recommendedTutorials: [],
      lastActivity: new Date(),
    }

    progress.totalTutorialsCompleted += 1
    progress.totalTimeSpent += data.timeSpent
    progress.averageScore = (progress.averageScore + data.score) / progress.totalTutorialsCompleted
    progress.achievements = [...new Set([...progress.achievements, ...data.achievements])]
    progress.lastActivity = new Date()

    // Determine user level based on progress
    if (progress.totalTutorialsCompleted >= 10 && progress.averageScore >= 80) {
      progress.currentLevel = 'advanced'
    } else if (progress.totalTutorialsCompleted >= 5 && progress.averageScore >= 60) {
      progress.currentLevel = 'intermediate'
    }

    this.userProgress.set(userId, progress)

    logger.info('User progress updated', {
      userId,
      tutorialId: data.tutorialId,
      newLevel: progress.currentLevel,
      totalCompleted: progress.totalTutorialsCompleted,
      averageScore: Math.round(progress.averageScore),
    })
  }

  private async getRecommendedTutorials(
    userId: string,
    completedTutorial: Tutorial
  ): Promise<Tutorial[]> {
    // Generate intelligent tutorial recommendations
    const userProgress = this.userProgress.get(userId)
    if (!userProgress) return []

    // Get tutorials that build on the completed one
    const recommendations = Array.from(this.tutorials.values())
      .filter(
        (t) =>
          (t.id !== completedTutorial.id && t.prerequisites?.includes(completedTutorial.id)) ||
          t.category === completedTutorial.category
      )
      .slice(0, 3)

    return recommendations
  }

  private setupKeyboardNavigation(): void {
    logger.info('Setting up keyboard navigation for tutorials')

    document.addEventListener('keydown', (event) => {
      if (!this.activeSession) return

      switch (event.key) {
        case 'Escape':
          if (event.ctrlKey) {
            this.pauseTutorial(this.activeSession.id)
          }
          break
        case 'Enter':
          if (event.ctrlKey) {
            this.advanceToNextStep(this.activeSession.id)
          }
          break
        case 'h':
          if (event.ctrlKey && event.altKey) {
            this.requestHint(this.activeSession.id)
          }
          break
        case 's':
          if (event.ctrlKey && event.altKey) {
            this.skipCurrentStep(this.activeSession.id)
          }
          break
      }
    })
  }

  private setupAccessibilityFeatures(): void {
    logger.info('Setting up accessibility features for tutorials')

    // Setup ARIA live regions for announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.style.position = 'absolute'
    liveRegion.style.left = '-10000px'
    liveRegion.id = 'tutorial-announcements'
    document.body.appendChild(liveRegion)
  }

  private announceToScreenReader(message: string): void {
    const liveRegion = document.getElementById('tutorial-announcements')
    if (liveRegion) {
      liveRegion.textContent = message

      // Clear after announcement to allow repeated messages
      setTimeout(() => {
        liveRegion.textContent = ''
      }, 1000)
    }
  }

  private loadStoredData(): void {
    // Load tutorials and user progress from storage
    logger.info('Loading stored tutorial data')
    // Implementation would load from localStorage, IndexedDB, or API
  }

  // Public utility methods

  public pauseTutorial(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session && session.status === 'active') {
      session.status = 'paused'
      this.emit('tutorialPaused', { session })
    }
  }

  public resumeTutorial(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session && session.status === 'paused') {
      session.status = 'active'
      this.emit('tutorialResumed', { session })
    }
  }

  public skipCurrentStep(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      const tutorial = this.tutorials.get(session.tutorialId)
      if (tutorial) {
        const currentStep = tutorial.steps[session.currentStepIndex]
        if (currentStep && !currentStep.skipable === false) {
          session.skippedSteps.push(currentStep.id)
          session.currentStepIndex += 1
          this.emit('stepSkipped', { session, step: currentStep })
        }
      }
    }
  }

  public advanceToNextStep(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      const tutorial = this.tutorials.get(session.tutorialId)
      if (tutorial) {
        const currentStep = tutorial.steps[session.currentStepIndex]
        if (currentStep) {
          this.trackProgress(sessionId, currentStep.id)
        }
      }
    }
  }

  public requestHint(sessionId: string): void {
    this.provideTutorialHint(sessionId, { userRequested: true })
  }

  public addTutorial(tutorial: Tutorial): void {
    this.tutorials.set(tutorial.id, tutorial)
    logger.info('Tutorial added to system', {
      tutorialId: tutorial.id,
      title: tutorial.title,
      stepsCount: tutorial.steps.length,
    })
  }

  public getTutorial(tutorialId: string): Tutorial | undefined {
    return this.tutorials.get(tutorialId)
  }

  public getAvailableTutorials(userId?: string): Tutorial[] {
    const tutorials = Array.from(this.tutorials.values())

    if (userId) {
      const userProgress = this.userProgress.get(userId)
      // Filter based on prerequisites and user level
      return tutorials.filter((tutorial) => {
        if (tutorial.prerequisites) {
          return tutorial.prerequisites.every((prereq) =>
            userProgress?.completedTutorials.includes(prereq)
          )
        }
        return true
      })
    }

    return tutorials
  }

  public getUserProgress(userId: string): TutorialProgress | undefined {
    return this.userProgress.get(userId)
  }

  // Event system
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        logger.error('Error in tutorial event handler', {
          event,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })
  }

  public on(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || []
    handlers.push(handler)
    this.eventHandlers.set(event, handlers)
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  // Cleanup
  public destroy(): void {
    logger.info('Destroying tutorial system')

    // Clear all sessions and data
    this.sessions.clear()
    this.eventHandlers.clear()
    this.activeSession = null

    // Remove accessibility elements
    const liveRegion = document.getElementById('tutorial-announcements')
    if (liveRegion) {
      liveRegion.remove()
    }

    // Remove event listeners
    document.removeEventListener('keydown', () => {})
  }
}

// Export singleton instance
export const tutorialSystem = new TutorialSystem({
  accessibilityMode: true,
  keyboardNavigation: true,
  enableAnalytics: true,
})

export default TutorialSystem
