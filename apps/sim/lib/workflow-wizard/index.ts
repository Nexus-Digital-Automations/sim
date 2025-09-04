/**
 * Workflow Wizard System - Main Entry Point
 *
 * This module provides a comprehensive workflow creation wizard system with:
 * - Advanced wizard engine with multi-step state management
 * - AI-powered template recommendations with machine learning
 * - Smart configuration assistance with automated validation
 * - Real-time analytics and A/B testing framework
 * - Enterprise-grade validation with security and compliance
 *
 * @author Claude Code Wizard System
 * @version 2.0.0
 * @created 2025-09-04
 */

// Core wizard engine
export {
  WizardEngine,
  createWizardEngine,
  type WizardStep,
  type WizardState,
  type WizardConfiguration,
  type BusinessGoal,
  type WorkflowTemplate,
  type TemplateBlock,
  type TemplateConnection,
  type TemplateConfiguration,
  type TemplateMetadata,
  type TemplateCustomization,
  type ValidationError,
  type ValidationRule,
  type WizardAnalyticsEvent,
  type TemplateRecommendation,
} from './wizard-engine'

// Template system
export {
  WizardTemplates,
  wizardTemplates,
  type TemplateDiscoveryQuery,
  type TemplateDiscoveryResult,
  type UserTemplateContext,
  type TemplateUsageHistory,
  type TemplatePerformanceMetrics,
  type TemplateMatchingScore,
  type TemplateSimilarityAnalysis,
} from './wizard-templates'

// Template recommendation engine
export {
  TemplateRecommendationEngine,
  templateRecommendationEngine,
  type UserContext,
  type ScoringFactors,
  type RecommendationConfig,
  type RecommendationContext,
  type MatchingCriteria,
} from './template-recommendation-engine'

// Configuration assistant
export {
  ConfigurationAssistant,
  configurationAssistant,
  type ConfigurationField,
  type ConfigurationContext,
  type ConfigurationValidationResult,
  type ConfigurationSuggestion,
  type OptimizationRecommendation,
} from './configuration-assistant'

// Analytics system
export {
  WizardAnalytics,
  wizardAnalytics,
  type EnhancedAnalyticsEvent,
  type AnalyticsEventType,
  type ABTest,
  type ConversionFunnel,
  type PerformanceDashboard,
  type UserSegment,
} from './wizard-analytics'

// Validation system
export {
  WizardValidation,
  wizardValidation,
  type EnhancedValidationError,
  type ValidationResult,
  type ValidationSeverity,
  type ValidationCategory,
  type ValidationSuggestion,
  type SecurityAssessment,
  type PerformanceAnalysis,
  type ComplianceStatus,
  type QualityMetrics,
} from './wizard-validation'