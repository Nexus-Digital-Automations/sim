/**
 * Type Definitions for Contextual Help System
 */

import type { ConversationContext } from '../tool-recommendation/types'

// Core Help Types
export interface HelpContext {
  id: string
  userId: string
  workspaceId: string
  sessionId: string
  currentRoute: string
  currentAction?: string
  toolContext?: {
    toolId: string
    toolName: string
    currentStep?: string
    parameters?: Record<string, any>
  }
  userState: {
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced'
    recentActions: string[]
    strugglingAreas: string[]
    preferredHelpMode: HelpDeliveryMode
    accessibility: AccessibilityPreferences
  }
  conversationContext?: ConversationContext
  timestamp: Date
  metadata: Record<string, any>
}

export interface AccessibilityPreferences {
  screenReader: boolean
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'normal' | 'large' | 'extra-large'
  voiceGuidance: boolean
  keyboardNavigation: boolean
}

export interface HelpContent {
  id: string
  title: string
  description: string
  content: string | HelpContentBlock[]
  type: 'tooltip' | 'panel' | 'modal' | 'inline' | 'voice' | 'tutorial'
  priority: 'low' | 'medium' | 'high' | 'critical'
  triggers: HelpTrigger[]
  conditions: HelpCondition[]
  tags: string[]
  multimedia?: {
    screenshots?: string[]
    videos?: string[]
    interactiveElements?: InteractiveElement[]
  }
  accessibility?: {
    altText?: string
    screenReaderText?: string
    keyboardShortcuts?: string[]
  }
  version: string
  lastUpdated: Date
  analytics: HelpAnalytics
}

export interface HelpContentBlock {
  id: string
  type: 'text' | 'image' | 'video' | 'code' | 'interactive' | 'link'
  content: string
  metadata?: Record<string, any>
}

export interface HelpTrigger {
  type: 'route' | 'action' | 'error' | 'time' | 'user_state' | 'context'
  condition: string | RegExp
  parameters?: Record<string, any>
}

export interface HelpCondition {
  type: 'user_expertise' | 'feature_flag' | 'time_of_day' | 'frequency' | 'context'
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface InteractiveElement {
  id: string
  type: 'button' | 'hotspot' | 'overlay' | 'highlight' | 'tooltip'
  position: {
    selector?: string
    x?: number
    y?: number
    relative?: 'element' | 'viewport'
  }
  action?: {
    type: 'navigate' | 'click' | 'highlight' | 'show_help'
    target: string
    parameters?: Record<string, any>
  }
  content?: string
  style?: Record<string, any>
}

// Guidance Types
export interface GuidanceStep {
  id: string
  order: number
  title: string
  description: string
  type: 'instruction' | 'action' | 'validation' | 'decision'
  content: {
    text: string
    multimedia?: {
      screenshot?: string
      video?: string
      animation?: string
    }
    interactiveElements?: InteractiveElement[]
  }
  actions?: GuidanceAction[]
  validation?: {
    type: 'element_exists' | 'url_matches' | 'value_equals' | 'custom'
    condition: string | ((context: HelpContext) => boolean)
    errorMessage?: string
  }
  nextSteps: {
    success?: string
    failure?: string
    skip?: string
  }
  timing?: {
    autoAdvance?: number
    maxDuration?: number
  }
  accessibility?: {
    screenReaderInstructions?: string
    keyboardShortcuts?: string[]
    focusTarget?: string
  }
}

export interface GuidanceAction {
  type: 'click' | 'type' | 'wait' | 'navigate' | 'highlight' | 'custom'
  target?: string
  value?: string
  parameters?: Record<string, any>
}

export interface GuidanceTutorial {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: number
  prerequisites?: string[]
  steps: GuidanceStep[]
  completionCriteria: {
    type: 'all_steps' | 'key_steps' | 'custom'
    requiredSteps?: string[]
    customValidator?: (context: HelpContext) => boolean
  }
  metadata: {
    version: string
    author: string
    lastUpdated: Date
    tags: string[]
  }
}

// Delivery Types
export type HelpDeliveryMode =
  | 'tooltip'
  | 'sidebar'
  | 'modal'
  | 'inline'
  | 'overlay'
  | 'voice'
  | 'chat'
  | 'notification'

export interface HelpDeliveryConfig {
  mode: HelpDeliveryMode
  position?: {
    anchor?: string
    offset?: { x: number; y: number }
    alignment?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  }
  styling?: {
    theme?: 'light' | 'dark' | 'auto'
    animation?: string
    zIndex?: number
    maxWidth?: number
    maxHeight?: number
  }
  behavior?: {
    autoClose?: number
    persistent?: boolean
    dismissible?: boolean
    followFocus?: boolean
  }
  accessibility?: {
    announceToScreenReader?: boolean
    trapFocus?: boolean
    returnFocus?: boolean
  }
}

export interface VoiceGuidanceConfig {
  voice?: {
    name?: string
    rate?: number
    pitch?: number
    volume?: number
  }
  language?: string
  ssml?: boolean
  interruption?: 'allow' | 'queue' | 'replace'
}

// Feedback Types
export interface FeedbackData {
  id: string
  userId: string
  sessionId: string
  helpContentId?: string
  tutorialId?: string
  type: 'rating' | 'comment' | 'bug_report' | 'suggestion' | 'completion'
  rating?: number
  comment?: string
  category?: string
  metadata: {
    context: HelpContext
    timestamp: Date
    userAgent?: string
    screenResolution?: string
    helpDeliveryMode?: HelpDeliveryMode
  }
  status: 'pending' | 'reviewed' | 'implemented' | 'dismissed'
  response?: {
    message: string
    timestamp: Date
    respondedBy: string
  }
}

// Analytics Types
export interface HelpAnalytics {
  views: number
  interactions: number
  completions: number
  averageRating: number
  feedbackCount: number
  lastViewed: Date
  effectivenessScore: number
  userSegments: {
    beginner: number
    intermediate: number
    advanced: number
  }
  deliveryModes: Record<HelpDeliveryMode, number>
  completionRate: number
  averageDuration: number
  dropOffPoints: Array<{
    step: string
    percentage: number
  }>
}

export interface HelpSystemMetrics {
  totalUsers: number
  activeHelpSessions: number
  contentLibrarySize: number
  averageHelpSessionDuration: number
  topHelpTopics: Array<{
    topic: string
    requests: number
    satisfaction: number
  }>
  userSatisfactionScore: number
  contentEffectiveness: Record<string, number>
  systemPerformance: {
    averageResponseTime: number
    cacheHitRate: number
    errorRate: number
  }
}

// Search and Discovery Types
export interface HelpSearchQuery {
  query: string
  filters?: {
    type?: string[]
    category?: string[]
    difficulty?: string[]
    tags?: string[]
  }
  context?: HelpContext
  options?: {
    fuzzy?: boolean
    semantic?: boolean
    maxResults?: number
    includeAnalytics?: boolean
  }
}

export interface HelpSearchResult {
  content: HelpContent
  relevanceScore: number
  snippet?: string
  highlightedTerms?: string[]
  similarContent?: HelpContent[]
}

// Content Management Types
export interface ContentVersion {
  id: string
  contentId: string
  version: string
  changes: Array<{
    field: string
    oldValue: any
    newValue: any
    changeType: 'create' | 'update' | 'delete'
  }>
  author: string
  timestamp: Date
  approved: boolean
  approvedBy?: string
  approvalDate?: Date
  rollbackAvailable: boolean
}

export interface ContentRecommendation {
  contentId: string
  reason: string
  confidence: number
  context: {
    userState: string
    currentAction: string
    similarUsers: string[]
  }
}

// Error Types
export interface HelpSystemError {
  code: string
  message: string
  context?: HelpContext
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolved?: boolean
  resolution?: {
    message: string
    timestamp: Date
    resolvedBy: string
  }
}

// Events Types
export interface HelpEvent {
  id: string
  type: 'view' | 'interaction' | 'completion' | 'feedback' | 'error'
  contentId?: string
  tutorialId?: string
  userId: string
  sessionId: string
  context: HelpContext
  data?: Record<string, any>
  timestamp: Date
}
