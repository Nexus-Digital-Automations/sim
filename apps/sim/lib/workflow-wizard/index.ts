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

// Configuration assistant
export {
  ConfigurationAssistant,
  type ConfigurationContext,
  type ConfigurationField,
  type ConfigurationSuggestion,
  type ConfigurationValidationResult,
  configurationAssistant,
  type OptimizationRecommendation,
} from './configuration-assistant'
// Template recommendation engine
export {
  type MatchingCriteria,
  type RecommendationConfig,
  type RecommendationContext,
  type ScoringFactors,
  TemplateRecommendationEngine,
  templateRecommendationEngine,
  type UserContext,
} from './template-recommendation-engine'
// Analytics system
export {
  type ABTest,
  type AnalyticsEventType,
  type ConversionFunnel,
  type EnhancedAnalyticsEvent,
  type PerformanceDashboard,
  type UserSegment,
  WizardAnalytics,
  wizardAnalytics,
} from './wizard-analytics'
// Core wizard engine
export {
  type BusinessGoal,
  createWizardEngine,
  type TemplateBlock,
  type TemplateConfiguration,
  type TemplateConnection,
  type TemplateCustomization,
  type TemplateMetadata,
  type TemplateRecommendation,
  type ValidationError,
  type ValidationRule,
  type WizardAnalyticsEvent,
  type WizardConfiguration,
  WizardEngine,
  type WizardState,
  type WizardStep,
  type WorkflowTemplate,
} from './wizard-engine'
// Template system
export {
  type TemplateDiscoveryQuery,
  type TemplateDiscoveryResult,
  type TemplateMatchingScore,
  type TemplatePerformanceMetrics,
  type TemplateSimilarityAnalysis,
  type TemplateUsageHistory,
  type UserTemplateContext,
  WizardTemplates,
  wizardTemplates,
} from './wizard-templates'
// Validation system
export {
  type ComplianceStatus,
  type EnhancedValidationError,
  type PerformanceAnalysis,
  type QualityMetrics,
  type SecurityAssessment,
  type ValidationCategory,
  type ValidationResult,
  type ValidationSeverity,
  type ValidationSuggestion,
  WizardValidation,
  wizardValidation,
} from './wizard-validation'
