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
export * from "./api/template-api";
// Export core modules
export * from "./core/template-engine";
// Export generators
export * from "./generators/journey-generator";
// Export library modules
export * from "./library/template-library";
// Journey types
export type {
  GeneratedJourney,
  JourneyGenerationContext,
  JourneyGenerationOptions,
  JourneyGenerationRequest,
  JourneyState,
  JourneyStateContent,
  JourneyStateType as JourneyStateTypeEnum,
} from "./types/journey-types";
// Export types selectively to avoid conflicts
// Core template types
export type {
  ConditionalExpression,
  ConditionalOperand,
  ParameterMapping as TemplateParameterMapping,
  ParameterValidation as TemplateParameterValidation,
  TemplateAnalytics,
  TemplateBlock,
  TemplateEdge,
  TemplateExportData,
  TemplateImportOptions,
  TemplateParameter,
  TemplateParameterType,
  TemplateSearchFilters,
  TemplateSearchResult,
  ValidationError as TemplateValidationError,
  ValidationResult as TemplateValidationResult,
  ValidationWarning as TemplateValidationWarning,
  WorkflowTemplate,
  WorkflowTemplateData,
} from "./types/template-types";
// Workflow types
export type {
  BlockConversionResult,
  ConversionError as WorkflowConversionError,
  ConversionRecommendation,
  ConversionWarning as WorkflowConversionWarning,
  JourneySuitability,
  WorkflowAnalysis,
  WorkflowBlockType,
  WorkflowComplexity,
  WorkflowMetadata,
} from "./types/workflow-types";
