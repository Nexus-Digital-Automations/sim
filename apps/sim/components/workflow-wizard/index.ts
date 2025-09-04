/**
 * Workflow Wizard Components Export Index
 * 
 * This file provides a centralized export point for all workflow wizard components,
 * making it easy to import any component from the workflow wizard system.
 * 
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

// Main wizard component
export { WorkflowWizard } from './workflow-wizard'
export type { WorkflowWizardProps } from './workflow-wizard'

// Individual step components
export { GoalSelection } from './goal-selection'
export type { GoalSelectionProps } from './goal-selection'

export { TemplateRecommendation } from './template-recommendation'
export type { TemplateRecommendationProps } from './template-recommendation'

export { BlockConfiguration } from './block-configuration'
export type { BlockConfigurationProps } from './block-configuration'

export { ConnectionWizard } from './connection-wizard'
export type { ConnectionWizardProps } from './connection-wizard'

export { PreviewValidation } from './preview-validation'
export type { PreviewValidationProps } from './preview-validation'

// Re-export wizard engine types for convenience
export type {
  BusinessGoal,
  UserContext,
  ValidationError,
  WizardConfiguration,
  WizardState,
  WizardStep,
  WorkflowTemplate,
  TemplateBlock,
  TemplateConnection,
} from '@/lib/workflow-wizard/wizard-engine'

// Default export is the main wizard component
export { WorkflowWizard as default } from './workflow-wizard'