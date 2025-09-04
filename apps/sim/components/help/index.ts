/**
 * Help System Components - Main exports
 *
 * Comprehensive help system UI components for the Sim platform.
 * Provides contextual assistance, search, tutorials, and AI-powered chat.
 *
 * @created 2025-09-04
 * @author Claude Development System
 */

export * from '@/lib/help/help-analytics'
export * from '@/lib/help/help-content-manager'
// Help system utilities and hooks
export * from '@/lib/help/help-context-provider'
// Type exports
export type {
  ActionSuggestion,
  ChatAction,
  ChatAttachment,
  // AI Chat types
  ChatMessage,
  ChatReaction,
  MessageFilter,
} from './ai-help-chat'
// Main help components
export { type AIHelpChatProps, default as AIHelpChat } from './ai-help-chat'
export type {
  ActionButton,
  // Contextual overlay types
  ContextualContent,
  HelpfulLink,
} from './contextual-overlay'
export { type ContextualOverlayProps, default as ContextualOverlay } from './contextual-overlay'
export { default as HelpPanel, type HelpPanelProps } from './help-panel'
// Re-export existing components if they exist
export { default as HelpProvider } from './help-provider'
export type {
  // Search types
  SearchFilter,
  SearchResult,
  SearchSuggestion,
} from './help-search-bar'
export { default as HelpSearchBar, type HelpSearchBarProps } from './help-search-bar'
export { default as HelpTrigger } from './help-trigger'
export type {
  CompletionData,
  CustomAction as TutorialCustomAction,
  Resource,
  StepBranch,
  TutorialInteraction,
  // Tutorial types
  TutorialStep,
} from './interactive-tutorial'
export {
  default as InteractiveTutorial,
  type InteractiveTutorialProps,
} from './interactive-tutorial'
