/**
 * Help System Components - Main exports
 *
 * Comprehensive help system UI components for the Sim platform.
 * Provides contextual assistance, search, tutorials, and AI-powered chat.
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

// Main help components
export { default as AIHelpChat, type AIHelpChatProps } from './ai-help-chat'
export { default as ContextualOverlay, type ContextualOverlayProps } from './contextual-overlay'
export { default as HelpPanel, type HelpPanelProps } from './help-panel'
export { default as HelpSearchBar, type HelpSearchBarProps } from './help-search-bar'
export { default as InteractiveTutorial, type InteractiveTutorialProps } from './interactive-tutorial'

// Type exports
export type {
  // AI Chat types
  ChatMessage,
  ActionSuggestion,
  ChatAttachment,
  ChatReaction,
  ChatAction,
  MessageFilter,
} from './ai-help-chat'

export type {
  // Contextual overlay types
  ContextualContent,
  ActionButton,
  HelpfulLink,
} from './contextual-overlay'

export type {
  // Tutorial types
  TutorialStep,
  CompletionData,
  TutorialInteraction,
  CustomAction as TutorialCustomAction,
  Resource,
  StepBranch,
} from './interactive-tutorial'

export type {
  // Search types
  SearchFilter,
  SearchResult,
  SearchSuggestion,
} from './help-search-bar'

// Re-export existing components if they exist
export { default as HelpProvider } from './help-provider'
export { default as HelpTrigger } from './help-trigger'

// Help system utilities and hooks
export * from '@/lib/help/help-context-provider'
export * from '@/lib/help/help-analytics'
export * from '@/lib/help/help-content-manager'