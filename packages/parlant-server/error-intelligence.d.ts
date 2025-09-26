/**
 * Enhanced Intelligent Error Intelligence System
 *
 * This module provides advanced natural language error translation, contextual
 * explanation generation, and intelligent learning capabilities that continuously
 * improve error handling based on user interactions and feedback.
 */
import { EventEmitter } from 'events';
import { type ErrorExplanation, type UserSkillLevel } from './error-explanations';
import type { BaseToolError } from './error-handler';
/**
 * Language and localization support
 */
export declare enum SupportedLanguage {
    ENGLISH = "en",
    SPANISH = "es",
    FRENCH = "fr",
    GERMAN = "de",
    JAPANESE = "ja",
    CHINESE_SIMPLIFIED = "zh-CN",
    PORTUGUESE = "pt",
    RUSSIAN = "ru",
    ITALIAN = "it",
    DUTCH = "nl"
}
/**
 * Communication styles for different user preferences
 */
export declare enum CommunicationStyle {
    FORMAL = "formal",// Professional, technical language
    CASUAL = "casual",// Friendly, conversational tone
    EMPATHETIC = "empathetic",// Understanding, supportive tone
    DIRECT = "direct",// Concise, to-the-point
    EDUCATIONAL = "educational"
}
/**
 * Error explanation context with user preferences
 */
export interface ExplanationContext {
    userId?: string;
    userSkillLevel: UserSkillLevel;
    preferredLanguage: SupportedLanguage;
    communicationStyle: CommunicationStyle;
    previousInteractions: UserInteraction[];
    deviceType: 'desktop' | 'mobile' | 'tablet';
    accessibility: AccessibilityPreferences;
    timezone: string;
    culturalContext: CulturalContext;
}
/**
 * User interaction tracking for learning
 */
export interface UserInteraction {
    timestamp: string;
    errorId: string;
    action: 'viewed' | 'resolved' | 'escalated' | 'feedback' | 'retry';
    details: Record<string, any>;
    outcome: 'success' | 'failure' | 'partial' | 'escalated';
    timeToResolution?: number;
    userSatisfaction?: number;
}
/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    audioDescriptions: boolean;
    keyboardNavigation: boolean;
}
/**
 * Cultural context for localized explanations
 */
export interface CulturalContext {
    region: string;
    businessHours: {
        start: string;
        end: string;
        timezone: string;
    };
    workingDays: string[];
    culturalNorms: string[];
    communicationPreferences: string[];
}
/**
 * Enhanced error explanation with intelligence
 */
export interface IntelligentErrorExplanation extends ErrorExplanation {
    language: SupportedLanguage;
    localizedMessages: Record<SupportedLanguage, string>;
    culturalAdaptations: CulturalAdaptation[];
    personalizedContent: PersonalizedContent;
    similarCasesFromUser: SimilarCase[];
    predictedActions: PredictedAction[];
    explanationVersion: string;
    effectivenessScore: number;
    improvementSuggestions: string[];
    alternativeExplanations: AlternativeExplanation[];
    conversationalFlow: ConversationalNode[];
    voiceOutput: VoiceOutput;
    visualAids: VisualAid[];
}
/**
 * Cultural adaptation for explanations
 */
export interface CulturalAdaptation {
    culture: string;
    adaptationType: 'language' | 'examples' | 'workflow' | 'timing';
    adaptation: string;
    reasoning: string;
}
/**
 * Personalized content based on user history
 */
export interface PersonalizedContent {
    greetingStyle: string;
    referenceToHistory: string;
    customizedExamples: string[];
    relevantContext: Record<string, any>;
    predictedConcerns: string[];
}
/**
 * Similar cases from user's history
 */
export interface SimilarCase {
    errorId: string;
    timestamp: string;
    similarity: number;
    resolution: string;
    outcome: 'success' | 'failure';
    lessonsLearned: string[];
}
/**
 * Predicted user actions
 */
export interface PredictedAction {
    action: string;
    probability: number;
    reasoning: string;
    supportingData: any[];
}
/**
 * Alternative explanations for different approaches
 */
export interface AlternativeExplanation {
    approach: string;
    explanation: string;
    suitableFor: UserSkillLevel[];
    effectiveness: number;
}
/**
 * Conversational flow for interactive guidance
 */
export interface ConversationalNode {
    id: string;
    message: string;
    expectedResponses: string[];
    nextNodes: Record<string, string>;
    actions: ConversationalAction[];
}
/**
 * Conversational actions
 */
export interface ConversationalAction {
    type: 'wait' | 'execute' | 'validate' | 'escalate';
    parameters: Record<string, any>;
    feedback: string;
}
/**
 * Voice output configuration
 */
export interface VoiceOutput {
    enabled: boolean;
    voice: string;
    speed: number;
    pitch: number;
    ssmlContent: string;
    audioFile?: string;
}
/**
 * Visual aids for explanations
 */
export interface VisualAid {
    type: 'diagram' | 'screenshot' | 'animation' | 'chart' | 'flowchart';
    title: string;
    description: string;
    url?: string;
    data?: any;
    interactive: boolean;
}
/**
 * Learning feedback from user interactions
 */
export interface LearningFeedback {
    explanationId: string;
    userId: string;
    feedback: {
        clarity: number;
        helpfulness: number;
        accuracy: number;
        completeness: number;
    };
    textFeedback: string;
    suggestedImprovements: string[];
    timestamp: string;
}
/**
 * Intelligent Error Translation and Learning System
 */
export declare class ErrorIntelligenceService extends EventEmitter {
    private userInteractions;
    private explanationCache;
    private learningModels;
    private translationCache;
    private culturalAdaptations;
    private effectivenessMetrics;
    constructor();
    /**
     * Generate intelligent, contextual error explanation
     */
    generateIntelligentExplanation(error: BaseToolError, context: ExplanationContext): Promise<IntelligentErrorExplanation>;
    /**
     * Translate error message to specified language with context
     */
    translateErrorMessage(error: BaseToolError, targetLanguage: SupportedLanguage, context: ExplanationContext): Promise<string>;
    /**
     * Learn from user interaction and feedback
     */
    recordUserInteraction(interaction: UserInteraction): Promise<void>;
    /**
     * Process learning feedback to improve explanations
     */
    processLearningFeedback(feedback: LearningFeedback): Promise<void>;
    /**
     * Get personalized error explanation based on user history
     */
    getPersonalizedExplanation(error: BaseToolError, userId: string, preferences?: Partial<ExplanationContext>): Promise<IntelligentErrorExplanation>;
    /**
     * Get explanation effectiveness metrics
     */
    getExplanationMetrics(timeRange?: {
        start: number;
        end: number;
    }): ExplanationMetrics;
    /**
     * Private helper methods
     */
    private initializeIntelligenceSystem;
    private initializeLearningModels;
    private initializeCulturalAdaptations;
    private startBackgroundLearning;
    private extractUserContext;
    private generateLocalizedMessages;
    private getCulturalAdaptations;
    private generatePersonalizedContent;
    private findSimilarCases;
    private predictUserActions;
    private getCurrentExplanationVersion;
    private calculateEffectivenessScore;
    private generateImprovementSuggestions;
    private generateAlternativeExplanations;
    private createConversationalFlow;
    private generateVoiceOutput;
    private generateVisualAids;
    private performContextualTranslation;
    private extractUserIdFromInteraction;
    private updateLearningModels;
    private analyzeInteractionPatterns;
    private storeFeedback;
    private updateExplanationEffectiveness;
    private generateImprovementActions;
    private applyImprovements;
    private updateLearningModelsFromFeedback;
    private buildUserContext;
    private trackExplanationGeneration;
    private analyzeAllInteractions;
    private updateModelEffectiveness;
    private determineGreetingStyle;
    private generateHistoryReference;
    private generateCustomizedExamples;
    private extractRelevantContext;
    private predictUserConcerns;
    private calculateErrorSimilarity;
    private getResolutionFromInteraction;
    private extractLessonsLearned;
    private getHistoricalEffectiveness;
    private calculateContextualAdjustment;
    private generateSSML;
    private selectVoiceForLanguage;
}
interface ExplanationMetrics {
    totalExplanations: number;
    averageEffectiveness: number;
    resolutionRate: number;
    userSatisfaction: number;
    languageDistribution: Map<SupportedLanguage, number>;
    skillLevelDistribution: Map<UserSkillLevel, number>;
    improvementOpportunities: string[];
}
/**
 * Singleton error intelligence service
 */
export declare const errorIntelligenceService: ErrorIntelligenceService;
/**
 * Convenience functions
 */
export declare const generateIntelligentExplanation: (error: BaseToolError, context: ExplanationContext) => Promise<IntelligentErrorExplanation>;
export declare const translateErrorMessage: (error: BaseToolError, targetLanguage: SupportedLanguage, context: ExplanationContext) => Promise<string>;
export declare const recordUserInteraction: (interaction: UserInteraction) => Promise<void>;
export declare const processLearningFeedback: (feedback: LearningFeedback) => Promise<void>;
export declare const getPersonalizedExplanation: (error: BaseToolError, userId: string, preferences?: Partial<ExplanationContext>) => Promise<IntelligentErrorExplanation>;
export {};
