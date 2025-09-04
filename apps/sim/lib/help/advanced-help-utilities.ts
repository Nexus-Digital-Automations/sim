/**
 * Advanced Help System Utilities - Supporting ML and AI Functions
 *
 * This file contains advanced utility functions for the contextual help system:
 * - Machine learning inference and prediction utilities
 * - Advanced context detection and device information
 * - User behavior analysis and learning profile generation
 * - Content personalization and A/B testing utilities
 * - Performance monitoring and real-time processing
 *
 * @created 2025-09-04
 * @author Claude Development System
 * @version 2.0.0
 */

import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logs/console/logger'
import type {
  HelpContent,
  HelpContext,
  PredictionResult,
  Suggestion,
  UserLearningProfile,
} from './contextual-help'

const logger = createLogger('AdvancedHelpUtilities')

// ========================
// DEVICE AND CONTEXT DETECTION
// ========================

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return {
      type: 'server' as const,
      os: 'unknown',
      browser: 'unknown',
      screenSize: { width: 0, height: 0 },
    }
  }

  const userAgent = navigator.userAgent
  const screenWidth = window.innerWidth || screen.width
  const screenHeight = window.innerHeight || screen.height

  const deviceType = screenWidth <= 768 ? 'mobile' : screenWidth <= 1024 ? 'tablet' : 'desktop'

  return {
    type: deviceType as 'mobile' | 'tablet' | 'desktop',
    os: detectOS(userAgent),
    browser: detectBrowser(userAgent),
    screenSize: { width: screenWidth, height: screenHeight },
  }
}

export function getSystemPerformance() {
  if (typeof window === 'undefined') {
    return {
      loadTime: 0,
      errorRate: 0,
      connectionSpeed: 'medium' as const,
    }
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const loadTime = navigation?.loadEventEnd - navigation?.loadEventStart || 0

  // Estimate connection speed based on load time and resource size
  const connectionSpeed = loadTime < 1000 ? 'fast' : loadTime < 3000 ? 'medium' : 'slow'

  return {
    loadTime,
    errorRate: 0, // Would be calculated from error tracking
    connectionSpeed: connectionSpeed as 'fast' | 'medium' | 'slow',
  }
}

export function buildUserJourney(userId?: string) {
  if (typeof window === 'undefined' || !userId) {
    return undefined
  }

  // Get navigation history from sessionStorage
  const historyKey = `user_journey_${userId.substring(0, 8)}`
  const storedHistory = sessionStorage.getItem(historyKey)
  const previousPages = storedHistory ? JSON.parse(storedHistory) : []

  const currentJourney = {
    entryPoint: document.referrer || 'direct',
    previousPages: previousPages.slice(-10), // Keep last 10 pages
    timeOnCurrentPage: performance.now(),
    actionsPerformed: [], // Would be populated from interaction tracking
    errorsEncountered: [], // Would be populated from error tracking
  }

  // Update history
  const updatedHistory = [...previousPages, window.location.pathname].slice(-10)
  sessionStorage.setItem(historyKey, JSON.stringify(updatedHistory))

  return currentJourney
}

function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac OS')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Unknown'
}

function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Unknown'
}

// ========================
// USER LEARNING PROFILE GENERATION
// ========================

export async function generateUserLearningProfile(userId: string): Promise<UserLearningProfile> {
  const operationId = nanoid()

  try {
    logger.info(`[${operationId}] Generating user learning profile`, {
      userId: `${userId.substring(0, 8)}***`,
    })

    // In a real implementation, this would query user interaction data
    // For now, we'll generate a realistic profile based on mock data
    const profile: UserLearningProfile = {
      userId,
      currentLevel: await detectUserLevel(userId),
      progressMetrics: {
        completedTutorials: await getCompletedTutorials(userId),
        masteredConcepts: await getMasteredConcepts(userId),
        strugglingAreas: await getStrugglingAreas(userId),
        timeInSystem: await getTotalTimeInSystem(userId),
        successRate: await calculateSuccessRate(userId),
      },
      learningStyle: {
        preferredContentType: await detectPreferredContentType(userId),
        pacePreference: await detectPacePreference(userId),
        feedbackFrequency: await detectFeedbackPreference(userId),
      },
      adaptationSettings: {
        autoAdvanceLevel: true,
        personalizedSuggestions: true,
        contextSensitivity: 'high',
      },
      lastUpdated: new Date(),
    }

    logger.info(`[${operationId}] User learning profile generated`, {
      userId: `${userId.substring(0, 8)}***`,
      level: profile.currentLevel,
      successRate: profile.progressMetrics.successRate,
    })

    return profile
  } catch (error) {
    logger.error(`[${operationId}] Failed to generate user learning profile`, {
      userId: `${userId.substring(0, 8)}***`,
      error: error instanceof Error ? error.message : String(error),
    })

    // Return default profile
    return {
      userId,
      currentLevel: 'beginner',
      progressMetrics: {
        completedTutorials: [],
        masteredConcepts: [],
        strugglingAreas: [],
        timeInSystem: 0,
        successRate: 0.5,
      },
      learningStyle: {
        preferredContentType: 'textual',
        pacePreference: 'self_paced',
        feedbackFrequency: 'immediate',
      },
      adaptationSettings: {
        autoAdvanceLevel: true,
        personalizedSuggestions: true,
        contextSensitivity: 'medium',
      },
      lastUpdated: new Date(),
    }
  }
}

// ========================
// MACHINE LEARNING UTILITIES
// ========================

export async function predictUserStruggle(
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): Promise<PredictionResult | null> {
  const operationId = nanoid()

  try {
    // Simulate ML model inference for struggle prediction
    const features = extractStrugglePredictionFeatures(context, userProfile)
    const prediction = await runStrugglePredictionModel(features)

    const result: PredictionResult = {
      userId: userProfile?.userId || 'anonymous',
      prediction: {
        strugglingProbability: prediction.probability,
        strugglingAreas: prediction.areas,
        recommendedInterventions: prediction.interventions,
      },
      confidence: prediction.confidence,
      timestamp: new Date(),
      context: {
        component: context.component,
        userLevel: context.userLevel,
        workflowState: context.workflowState,
      },
    }

    logger.info(`[${operationId}] User struggle prediction completed`, {
      probability: prediction.probability,
      confidence: prediction.confidence,
      areas: prediction.areas.length,
    })

    return result
  } catch (error) {
    logger.error(`[${operationId}] Failed to predict user struggle`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function predictContentRecommendations(
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): Promise<PredictionResult[]> {
  const operationId = nanoid()

  try {
    // Simulate ML model inference for content recommendations
    const features = extractContentRecommendationFeatures(context, userProfile)
    const recommendations = await runContentRecommendationModel(features)

    const results: PredictionResult[] = recommendations.map((rec, index) => ({
      userId: userProfile?.userId || 'anonymous',
      prediction: {
        contentId: rec.contentId,
        relevanceScore: rec.score,
        reasonCode: rec.reason,
      },
      confidence: rec.confidence,
      timestamp: new Date(),
      context: {
        component: context.component,
        userLevel: context.userLevel,
        rank: index + 1,
      },
    }))

    logger.info(`[${operationId}] Content recommendations predicted`, {
      recommendationsCount: results.length,
      avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    })

    return results
  } catch (error) {
    logger.error(`[${operationId}] Failed to predict content recommendations`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

export function calculateMLRelevanceScore(
  content: HelpContent,
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): number {
  try {
    let score = 0.5 // Base score

    // Context matching (40% weight)
    if (content.context.component === context.component) score += 0.2
    if (content.context.userLevel === context.userLevel) score += 0.15
    if (content.context.workflowState === context.workflowState) score += 0.05

    // User profile matching (30% weight)
    if (userProfile) {
      // Preferred content type
      if (userProfile.learningStyle.preferredContentType === 'visual' && content.videoUrl) {
        score += 0.1
      }
      if (
        userProfile.learningStyle.preferredContentType === 'interactive' &&
        content.contentType === 'interactive'
      ) {
        score += 0.1
      }

      // Skill level appropriateness
      const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert']
      const userLevelIndex = levelOrder.indexOf(userProfile.currentLevel)
      const contentLevelIndex = levelOrder.indexOf(content.metadata?.difficulty || 'beginner')

      if (Math.abs(userLevelIndex - contentLevelIndex) <= 1) {
        score += 0.1
      }
    }

    // Historical effectiveness (20% weight)
    if (content.analytics?.effectivenessScore) {
      score += (content.analytics.effectivenessScore / 100) * 0.2
    }

    // Content freshness (10% weight)
    if (content.metadata?.updatedAt) {
      const daysSinceUpdate =
        (Date.now() - content.metadata.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      const freshnessScore = Math.max(0, 1 - daysSinceUpdate / 90) // Fresh for 90 days
      score += freshnessScore * 0.1
    }

    return Math.min(1, Math.max(0, score))
  } catch (error) {
    logger.error('Failed to calculate ML relevance score', {
      contentId: content.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return 0.5
  }
}

// ========================
// CONTENT PERSONALIZATION
// ========================

export function personalizeHelpContent(
  content: HelpContent[],
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): HelpContent[] {
  const operationId = nanoid()

  try {
    const personalizedContent = content.map((item) => {
      const personalizedItem = { ...item }

      // Personalize based on user learning style
      if (userProfile?.learningStyle.preferredContentType === 'visual' && item.videoUrl) {
        personalizedItem.priority = 'high'
      }

      // Adjust content complexity based on user level
      if (userProfile?.currentLevel === 'beginner' && item.type === 'tutorial') {
        personalizedItem.priority = 'high'
      }

      // Add personalization metadata
      personalizedItem.personalizedFor = userProfile?.userId

      return personalizedItem
    })

    logger.info(`[${operationId}] Content personalized`, {
      originalCount: content.length,
      personalizedCount: personalizedContent.length,
      userId: userProfile?.userId ? `${userProfile.userId.substring(0, 8)}***` : 'anonymous',
    })

    return personalizedContent
  } catch (error) {
    logger.error(`[${operationId}] Failed to personalize content`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return content
  }
}

export function isAdvancedHelpRelevant(
  help: HelpContent,
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): boolean {
  try {
    // Basic relevance check
    if (help.context.component !== context.component) return false

    // User level check with tolerance
    const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert']
    const userLevelIndex = levelOrder.indexOf(context.userLevel)
    const helpLevelIndex = levelOrder.indexOf(help.context.userLevel)

    if (helpLevelIndex > userLevelIndex + 1) return false // Too advanced

    // Workflow state relevance
    if (help.context.workflowState && context.workflowState !== help.context.workflowState) {
      return false
    }

    // User profile preferences
    if (userProfile) {
      // Check if content type matches preference
      if (userProfile.learningStyle.preferredContentType === 'video' && !help.videoUrl) {
        return false
      }

      // Check if user has already mastered this concept
      if (
        help.metadata?.tags?.some((tag) =>
          userProfile.progressMetrics.masteredConcepts.includes(tag)
        )
      ) {
        return false
      }
    }

    // Analytics-based filtering
    if (help.analytics && help.analytics.shown > 5 && help.analytics.clicked === 0) {
      return false // Content shown many times but never clicked
    }

    return true
  } catch (error) {
    logger.error('Failed to check advanced help relevance', {
      helpId: help.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export function enhancedSuggestionToHelpContent(
  suggestion: Suggestion,
  context: HelpContext,
  userProfile?: UserLearningProfile | null
): HelpContent {
  return {
    id: `suggestion-${suggestion.id}`,
    contentId: suggestion.id,
    version: 1,
    title: suggestion.title,
    content: suggestion.description,
    contentType: 'markdown',
    type: 'tip',
    context,
    priority: suggestion.confidence > 80 ? 'high' : suggestion.confidence > 60 ? 'medium' : 'low',
    relevanceScore: suggestion.relevanceScore,
    dismissible: true,
    personalizedFor: userProfile?.userId,
    analytics: {
      shown: suggestion.analytics.showCount,
      clicked: Math.round(suggestion.analytics.showCount * suggestion.analytics.acceptanceRate),
      dismissed: 0,
      completed: Math.round(suggestion.analytics.showCount * suggestion.analytics.completionRate),
      averageEngagementTime: 0,
      effectivenessScore: suggestion.analytics.userFeedback * 20, // Convert 1-5 to 0-100
      userFeedback: [],
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'ai-engine',
      tags: suggestion.triggers,
      category: suggestion.category,
      difficulty: userProfile?.currentLevel || 'beginner',
      businessValue: suggestion.impact,
    },
  }
}

// ========================
// MOCK DATA GENERATION HELPERS
// ========================

async function detectUserLevel(
  userId: string
): Promise<'beginner' | 'intermediate' | 'advanced' | 'expert'> {
  // Mock implementation based on user ID hash
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'] as const
  return levels[hash % levels.length]
}

async function getCompletedTutorials(userId: string): Promise<string[]> {
  // Mock implementation
  return ['workflow_basics', 'block_configuration']
}

async function getMasteredConcepts(userId: string): Promise<string[]> {
  // Mock implementation
  return ['drag_drop', 'basic_blocks']
}

async function getStrugglingAreas(userId: string): Promise<string[]> {
  // Mock implementation
  return ['api_configuration', 'error_handling']
}

async function getTotalTimeInSystem(userId: string): Promise<number> {
  // Mock implementation - return hours
  return Math.floor(Math.random() * 100) + 10
}

async function calculateSuccessRate(userId: string): Promise<number> {
  // Mock implementation
  return Math.random() * 0.4 + 0.6 // 60-100% success rate
}

async function detectPreferredContentType(
  userId: string
): Promise<'visual' | 'textual' | 'interactive' | 'video'> {
  const types = ['visual', 'textual', 'interactive', 'video'] as const
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return types[hash % types.length]
}

async function detectPacePreference(
  userId: string
): Promise<'self_paced' | 'guided' | 'structured'> {
  const paces = ['self_paced', 'guided', 'structured'] as const
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return paces[hash % paces.length]
}

async function detectFeedbackPreference(
  userId: string
): Promise<'immediate' | 'periodic' | 'minimal'> {
  const frequencies = ['immediate', 'periodic', 'minimal'] as const
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return frequencies[hash % frequencies.length]
}

// ========================
// MOCK ML MODEL INFERENCE
// ========================

async function runStrugglePredictionModel(features: any) {
  // Simulate ML model processing time
  await new Promise((resolve) => setTimeout(resolve, 10))

  return {
    probability: Math.random() * 0.8 + 0.1, // 10-90% chance
    areas: ['navigation', 'configuration'].filter(() => Math.random() > 0.5),
    interventions: ['show_tutorial', 'provide_guidance'].filter(() => Math.random() > 0.3),
    confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
  }
}

async function runContentRecommendationModel(features: any) {
  // Simulate ML model processing time
  await new Promise((resolve) => setTimeout(resolve, 15))

  return Array.from({ length: 3 }, (_, i) => ({
    contentId: `content_${i + 1}`,
    score: Math.random() * 0.5 + 0.5, // 50-100% relevance
    reason: ['context_match', 'user_preference', 'historical_success'][i],
    confidence: Math.random() * 0.3 + 0.7,
  }))
}

function extractStrugglePredictionFeatures(
  context: HelpContext,
  userProfile?: UserLearningProfile | null
) {
  return {
    sessionDuration: context.sessionTime || 0,
    errorFrequency: context.strugglesDetected?.length || 0,
    userLevel: context.userLevel,
    componentComplexity: context.workflowComplexity || 'simple',
    previousAttempts: context.previousAttempts || 0,
    userSuccessRate: userProfile?.progressMetrics.successRate || 0.5,
  }
}

function extractContentRecommendationFeatures(
  context: HelpContext,
  userProfile?: UserLearningProfile | null
) {
  return {
    contextSimilarity: 1.0, // Would be calculated based on content matching
    historicalEffectiveness: 0.8, // Would be from analytics
    contentFreshness: 0.9, // Would be based on update time
    userPreferences: {
      contentType: userProfile?.learningStyle.preferredContentType || 'textual',
      complexity: context.userLevel,
    },
  }
}

export async function getUserPreferences(userId: string) {
  // Mock implementation for user preferences
  return {
    helpStyle: 'detailed' as const,
    preferredContentType: 'text' as const,
    language: 'en',
    accessibilityNeeds: [] as string[],
  }
}

// Export all utility functions
export default {
  getDeviceInfo,
  getSystemPerformance,
  buildUserJourney,
  generateUserLearningProfile,
  predictUserStruggle,
  predictContentRecommendations,
  calculateMLRelevanceScore,
  personalizeHelpContent,
  isAdvancedHelpRelevant,
  enhancedSuggestionToHelpContent,
  getUserPreferences,
}
