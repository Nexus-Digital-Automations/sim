/**
 * Contextual Help and Guidance System
 *
 * Intelligent contextual help system that provides just-in-time guidance
 * and assistance for tool usage, configuration, and troubleshooting.
 *
 * @author Claude Code Contextual Help Agent
 * @version 1.0.0
 */

export { ContextualHelpSystem } from './core/help-system'
export { InteractiveGuidance } from './guidance/interactive-guidance'
export { HelpContentManager } from './content/content-manager'
export { MultiModalDelivery } from './delivery/multi-modal-delivery'
export { UserFeedbackSystem } from './feedback/feedback-system'

// Types
export type {
  HelpContext,
  HelpContent,
  GuidanceStep,
  HelpDeliveryMode,
  FeedbackData,
  HelpAnalytics,
} from './types'

// Instances
export { contextualHelpSystem } from './core/help-system'
export { interactiveGuidance } from './guidance/interactive-guidance'
export { helpContentManager } from './content/content-manager'
export { multiModalDelivery } from './delivery/multi-modal-delivery'
export { userFeedbackSystem } from './feedback/feedback-system'