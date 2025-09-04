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

// Re-export wizard engine types for convenience
export type {
  BusinessGoal,
  TemplateBlock,
  TemplateConnection,
  UserContext,
  ValidationError,
  WizardConfiguration,
  WizardState,
  WizardStep,
  WorkflowTemplate,
} from '@/lib/workflow-wizard/wizard-engine'
export type { BlockConfigurationProps } from './block-configuration'
export { BlockConfiguration } from './block-configuration'
export type { ConnectionWizardProps } from './connection-wizard'
export { ConnectionWizard } from './connection-wizard'
export type { GoalSelectionProps } from './goal-selection'
// Individual step components
export { GoalSelection } from './goal-selection'
export type { PreviewValidationProps } from './preview-validation'
export { PreviewValidation } from './preview-validation'
export type { TemplateRecommendationProps } from './template-recommendation'
export { TemplateRecommendation } from './template-recommendation'
export type { WorkflowWizardProps } from './workflow-wizard'
// Main wizard component
// Default export is the main wizard component
export { WorkflowWizard, WorkflowWizard as default } from './workflow-wizard'
