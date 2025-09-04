/**
 * Advanced Help System Components - Complete UI Component Library
 *
 * Comprehensive help system UI components for the Sim platform providing:
 * - AI-powered contextual assistance and intelligent chat interfaces
 * - Advanced search with semantic matching and voice input
 * - Interactive tutorials with progress tracking and adaptive learning
 * - Floating help widgets with smart triggers and user behavior analysis
 * - Contextual overlays with smart positioning and collision detection
 * - Real-time help analytics and user interaction tracking
 * - Accessibility-compliant components with keyboard navigation
 * - Mobile-responsive design with touch gesture support
 *
 * Key Features:
 * - Smart struggle detection and proactive assistance triggers
 * - Multi-language support and localization ready
 * - Integration with AI help engines and semantic search
 * - Progressive enhancement with graceful degradation
 * - Performance-optimized with lazy loading and caching
 * - Comprehensive analytics and user behavior insights
 *
 * @created 2025-09-04
 * @author Advanced Help UI Components Specialist
 * @version 2.0.0
 */

// ========================
// CORE SERVICES & UTILITIES
// ========================

export * from '@/lib/help/ai-help-integration'
export * from '@/lib/help/help-analytics'
export * from '@/lib/help/help-content-manager'
export * from '@/lib/help/help-context-provider'
// ========================
// ADVANCED COMPONENTS
// ========================

// Advanced Search Interface - AI-powered semantic search with voice input
export type {
  AdvancedSearchInterfaceProps,
  SearchFilters,
  SearchSuggestion as AdvancedSearchSuggestion,
} from './advanced-search-interface'
export { default as AdvancedSearchInterface } from './advanced-search-interface'
// AI Help Chat - Intelligent conversational assistance with context awareness
export type {
  ActionSuggestion,
  AIHelpChatProps,
  ChatAction,
  ChatAttachment,
  ChatMessage,
  ChatReaction,
  MessageFilter,
} from './ai-help-chat'
export { default as AIHelpChat } from './ai-help-chat'
// Contextual Overlay - Smart positioning overlays with collision detection
export type {
  ActionButton,
  ContextualContent,
  ContextualOverlayProps,
  HelpfulLink,
} from './contextual-overlay'
export { default as ContextualOverlay } from './contextual-overlay'
// Floating Chat Widget - Persistent AI assistant with struggle detection
export type { FloatingChatWidgetProps } from './floating-chat-widget'
export { ChatWidgetProvider, default as FloatingChatWidget } from './floating-chat-widget'
// Help Panel - Comprehensive help browser with advanced filtering
export { default as HelpPanel, type HelpPanelProps } from './help-panel'
// Help Spotlight - Interactive guided tours with progress tracking
export { default as HelpSpotlight, type HelpSpotlightProps } from './help-spotlight'
// Tutorial Progress System - Advanced learning paths with adaptive content
export type {
  Achievement,
  Tutorial,
  TutorialAnalytics,
  TutorialProgress,
  TutorialProgressSystemProps,
  TutorialStep as AdvancedTutorialStep,
  UserLearningProfile,
} from './tutorial-progress-system'
export { default as TutorialProgressSystem } from './tutorial-progress-system'

// ========================
// EXISTING COMPONENTS (Enhanced)
// ========================

export { default as HelpProvider } from './help-provider'
// Enhanced Search Bar - Legacy component with new features
export type {
  HelpSearchBarProps,
  SearchFilter,
  SearchResult,
  SearchSuggestion,
} from './help-search-bar'
export { default as HelpSearchBar } from './help-search-bar'
export { default as HelpTrigger } from './help-trigger'
// Interactive Tutorial - Enhanced with progress system integration
export type {
  CompletionData,
  CustomAction as TutorialCustomAction,
  InteractiveTutorialProps,
  Resource,
  StepBranch,
  TutorialInteraction,
  TutorialStep,
} from './interactive-tutorial'
export { default as InteractiveTutorial } from './interactive-tutorial'

// ========================
// COMPONENT COMPOSITION HELPERS
// ========================

/**
 * Pre-configured component combinations for common use cases
 */

// Complete Help System Setup
export interface CompleteHelpSystemProps {
  enableFloatingWidget?: boolean
  enableAdvancedSearch?: boolean
  enableTutorialSystem?: boolean
  enableAnalytics?: boolean
  customConfiguration?: {
    searchConfig?: Partial<AdvancedSearchInterfaceProps>
    chatConfig?: Partial<AIHelpChatProps>
    tutorialConfig?: Partial<TutorialProgressSystemProps>
    floatingWidgetConfig?: Partial<FloatingChatWidgetProps>
  }
}

/**
 * Helper function to create a complete help system with all components
 */
export const createCompleteHelpSystem = (props: CompleteHelpSystemProps) => {
  return {
    FloatingWidget: FloatingChatWidget,
    AdvancedSearch: AdvancedSearchInterface,
    TutorialSystem: TutorialProgressSystem,
    AIChat: AIHelpChat,
    HelpPanel,
    HelpSpotlight,
    config: props.customConfiguration,
  }
}
