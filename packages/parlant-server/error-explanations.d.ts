/**
 * User-Friendly Error Explanation System
 *
 * This module provides comprehensive, contextual error explanations with multiple skill levels,
 * interactive guidance, and actionable resolution steps. It transforms technical errors into
 * understandable messages that help users resolve issues effectively.
 */
import type { BaseToolError } from './error-handler'
import { type ErrorCategory, type ErrorImpact, ErrorSeverity } from './error-taxonomy'
import type { ParlantLogContext } from './logging'
/**
 * User skill levels for tailored explanations
 */
export declare enum UserSkillLevel {
  BEGINNER = 'beginner', // Non-technical users
  INTERMEDIATE = 'intermediate', // Some technical knowledge
  ADVANCED = 'advanced', // Technical users
  DEVELOPER = 'developer',
}
/**
 * Explanation formats for different presentation contexts
 */
export declare enum ExplanationFormat {
  BRIEF = 'brief', // Short, concise explanation
  DETAILED = 'detailed', // Comprehensive explanation
  INTERACTIVE = 'interactive', // Step-by-step guidance
  TECHNICAL = 'technical',
}
/**
 * Comprehensive error explanation with multiple presentation options
 */
export interface ErrorExplanation {
  id: string
  errorId: string
  title: string
  summary: string
  messages: {
    [UserSkillLevel.BEGINNER]: string
    [UserSkillLevel.INTERMEDIATE]: string
    [UserSkillLevel.ADVANCED]: string
    [UserSkillLevel.DEVELOPER]: string
  }
  resolutionSteps: ResolutionStep[]
  quickActions: QuickAction[]
  preventionTips: PreventionTip[]
  category: ErrorCategory
  severity: ErrorSeverity
  impact: ErrorImpact
  timeToResolve: string
  relatedErrors: string[]
  documentationLinks: DocumentationLink[]
  troubleshootingTree: TroubleshootingNode
  diagnosticQuestions: DiagnosticQuestion[]
  timestamp: string
  context: ParlantLogContext
}
/**
 * Step-by-step resolution guidance
 */
export interface ResolutionStep {
  id: string
  order: number
  title: string
  description: string
  skillLevel: UserSkillLevel
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  instructions: {
    [UserSkillLevel.BEGINNER]: string[]
    [UserSkillLevel.INTERMEDIATE]: string[]
    [UserSkillLevel.ADVANCED]: string[]
    [UserSkillLevel.DEVELOPER]: string[]
  }
  screenshots?: string[]
  codeExamples?: CodeExample[]
  successCriteria: string
  commonMistakes: string[]
  prerequisites: string[]
  dependsOn: string[]
}
/**
 * Quick action buttons for immediate fixes
 */
export interface QuickAction {
  id: string
  title: string
  description: string
  action: 'retry' | 'reset' | 'refresh' | 'contact_support' | 'custom'
  customAction?: string
  parameters?: Record<string, any>
  skillLevel: UserSkillLevel
  estimatedTime: string
  requiresAuth: boolean
  requiresElevation: boolean
  reversible: boolean
  warningMessage?: string
  confirmationMessage?: string
  successMessage: string
}
/**
 * Prevention tips to avoid future occurrences
 */
export interface PreventionTip {
  id: string
  title: string
  description: string
  category: 'best_practice' | 'configuration' | 'monitoring' | 'training'
  applicability: UserSkillLevel[]
  implementationSteps: string[]
  tools: string[]
  resources: string[]
}
/**
 * Documentation and help links
 */
export interface DocumentationLink {
  id: string
  title: string
  description: string
  url: string
  type: 'official_docs' | 'tutorial' | 'video' | 'forum' | 'blog'
  skillLevel: UserSkillLevel
  estimatedReadTime: string
}
/**
 * Code examples for technical resolutions
 */
export interface CodeExample {
  id: string
  title: string
  description: string
  language: string
  code: string
  explanation: string
  skillLevel: UserSkillLevel
}
/**
 * Interactive troubleshooting tree
 */
export interface TroubleshootingNode {
  id: string
  question: string
  answers: TroubleshootingAnswer[]
}
export interface TroubleshootingAnswer {
  id: string
  text: string
  nextNode?: TroubleshootingNode
  resolution?: string
  actions?: QuickAction[]
}
/**
 * Diagnostic questions for context gathering
 */
export interface DiagnosticQuestion {
  id: string
  question: string
  type: 'yes_no' | 'multiple_choice' | 'text' | 'number'
  options?: string[]
  required: boolean
  helpText: string
  dependsOn?: string
  showIf?: (answers: Record<string, any>) => boolean
}
/**
 * Error explanation service
 */
export declare class ErrorExplanationService {
  private explanationTemplates
  private contextualModifiers
  constructor()
  /**
   * Generate comprehensive error explanation
   */
  generateExplanation(
    error: BaseToolError,
    userSkillLevel?: UserSkillLevel,
    format?: ExplanationFormat,
    userContext?: Record<string, any>
  ): ErrorExplanation
  /**
   * Generate skill-level specific messages
   */
  private generateSkillLevelMessages
  /**
   * Generate resolution steps based on error and skill level
   */
  private generateResolutionSteps
  /**
   * Generate quick actions for immediate problem resolution
   */
  private generateQuickActions
  /**
   * Generate prevention tips
   */
  private generatePreventionTips
  /**
   * Generate interactive troubleshooting tree
   */
  private generateTroubleshootingTree
  /**
   * Generate diagnostic questions
   */
  private generateDiagnosticQuestions
  /**
   * Template interpolation with error context
   */
  private interpolateTemplate
  /**
   * Initialize explanation templates for different error types
   */
  private initializeExplanationTemplates
  /**
   * Add tool execution error templates
   */
  private addToolExecutionTemplates
  /**
   * Add authentication error templates
   */
  private addAuthenticationTemplates
  /**
   * Add system resource error templates
   */
  private addSystemResourceTemplates
  /**
   * Add user input error templates
   */
  private addUserInputTemplates
  /**
   * Initialize contextual modifiers
   */
  private initializeContextualModifiers
  /**
   * Apply contextual modifications to templates
   */
  private applyContextualModifications
  /**
   * Helper methods
   */
  private shouldIncludeStep
  private shouldIncludeAction
  private addErrorSpecificSteps
  private generateTitle
  private generateSummary
  private estimateTimeToResolve
  private findRelatedErrors
  private findDocumentationLinks
  private interpolateTroubleshootingNode
  private getDefaultTemplate
}
/**
 * Singleton error explanation service
 */
export declare const errorExplanationService: ErrorExplanationService
/**
 * Convenience function for generating explanations
 */
export declare const explainError: (
  error: BaseToolError,
  userSkillLevel?: UserSkillLevel,
  format?: ExplanationFormat,
  userContext?: Record<string, any>
) => ErrorExplanation
