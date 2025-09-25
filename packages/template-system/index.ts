/**
 * Template System for Dynamic Journey Generation
 * ==============================================
 *
 * This module provides a comprehensive template system that enables dynamic journey
 * creation from workflow templates. It supports parameterization, inheritance,
 * composition patterns, and custom workflow-to-journey transformations.
 *
 * Key Features:
 * - Template framework with parameter injection
 * - Template inheritance and composition
 * - Dynamic journey generation from workflows
 * - Template versioning and migration support
 * - Comprehensive template library with common patterns
 * - Template analytics and usage tracking
 */

// Export API modules
export * from './api/template-api'

// Export core modules
export * from './core/template-engine'

// Export generators
export * from './generators/journey-generator'

// Export library modules
export * from './library/template-library'

// Export types selectively to avoid conflicts
// Core template types
export type {
  WorkflowTemplate,
  TemplateParameter,
  TemplateParameterType,
  WorkflowTemplateData,
  TemplateBlock,
  TemplateEdge,
  ConditionalExpression,
  ConditionalOperand,
  ParameterMapping as TemplateParameterMapping,
  ValidationResult as TemplateValidationResult,
  ValidationError as TemplateValidationError,
  ValidationWarning as TemplateValidationWarning,
  ParameterValidation as TemplateParameterValidation,
  TemplateSearchFilters,
  TemplateSearchResult,
  TemplateAnalytics,
  TemplateExportData,
  TemplateImportOptions
} from './types/template-types'

// Journey types
export type {
  JourneyGenerationRequest,
  JourneyGenerationOptions,
  JourneyGenerationContext,
  GeneratedJourney,
  JourneyState,
  JourneyStateType as JourneyStateTypeEnum,
  JourneyStateContent
} from './types/journey-types'

// Workflow types
export type {
  WorkflowAnalysis,
  WorkflowComplexity,
  JourneySuitability,
  ConversionRecommendation,
  WorkflowMetadata,
  WorkflowBlockType,
  BlockConversionResult,
  ConversionError as WorkflowConversionError,
  ConversionWarning as WorkflowConversionWarning
} from './types/workflow-types'