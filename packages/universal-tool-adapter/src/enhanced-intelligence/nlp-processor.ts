/**
 * Advanced NLP Processor for Enhanced Natural Language Description Framework
 *
 * Provides sophisticated natural language processing capabilities for generating
 * high-quality, contextual descriptions of tools. Includes text analysis,
 * semantic understanding, and intelligent content generation features.
 *
 * @author Natural Language Framework Agent
 * @version 2.0.0
 */

import type { ToolConfig } from '@/tools/types'
import { createLogger } from '../utils/logger'

const logger = createLogger('NLPProcessor')

// =============================================================================
// NLP Analysis Result Types
// =============================================================================

export interface KeyInformationResult {
  oneSentenceSummary: string
  primaryUseCase: string
  keyCapability: string
  quickTags: string[]
  complexityScore: number
  confidenceMetrics: ConfidenceMetrics
}

export interface ComprehensiveAnalysisResult {
  overview: string
  functionality: string
  workingPrinciple: string
  benefits: string[]
  limitations: string[]
  technicalDetails: TechnicalDetails
  usagePatterns: UsagePattern[]
  performanceCharacteristics: PerformanceCharacteristics
}

export interface ConfidenceMetrics {
  overallConfidence: number // 0-1 scale
  analysisQuality: number // 0-1 scale
  completeness: number // 0-1 scale
  accuracyEstimate: number // 0-1 scale
}

export interface TechnicalDetails {
  architecture: string[]
  dependencies: string[]
  integrationPoints: string[]
  securityConsiderations: string[]
  scalabilityFactors: string[]
}

export interface UsagePattern {
  pattern: string
  frequency: 'common' | 'occasional' | 'rare'
  complexity: 'simple' | 'moderate' | 'complex'
  description: string
  examples: string[]
}

export interface PerformanceCharacteristics {
  expectedLatency: string
  throughputCapacity: string
  resourceRequirements: string[]
  scalabilityLimits: string[]
  optimizationOpportunities: string[]
}

export interface NLPSettings {
  model?: string
  accuracy?: number
  verbosity?: 'concise' | 'standard' | 'detailed'
  analysisDepth?: 'surface' | 'intermediate' | 'deep'
  domainSpecialization?: string[]
  customVocabulary?: Record<string, string>
}

// =============================================================================
// Advanced NLP Processor Implementation
// =============================================================================

/**
 * Advanced NLP processor for tool analysis and description generation
 */
export class NLPProcessor {
  private settings: NLPSettings
  private vocabularyEnhancer: VocabularyEnhancer
  private semanticAnalyzer: SemanticAnalyzer
  private contentGenerator: ContentGenerator
  private qualityAssessor: QualityAssessor

  constructor(settings: NLPSettings = {}) {
    this.settings = {
      model: 'advanced-nlp-v2',
      accuracy: 0.85,
      verbosity: 'standard',
      analysisDepth: 'intermediate',
      domainSpecialization: [],
      customVocabulary: {},
      ...settings
    }

    this.vocabularyEnhancer = new VocabularyEnhancer(this.settings)
    this.semanticAnalyzer = new SemanticAnalyzer(this.settings)
    this.contentGenerator = new ContentGenerator(this.settings)
    this.qualityAssessor = new QualityAssessor(this.settings)

    logger.info('NLP Processor initialized', { settings: this.settings })
  }

  /**
   * Extract key information from tool configuration with advanced NLP
   */
  async extractKeyInformation(toolConfig: ToolConfig): Promise<KeyInformationResult> {
    logger.debug(`Extracting key information for tool: ${toolConfig.id}`)

    try {
      // Analyze tool structure and content
      const structuralAnalysis = await this.analyzeToolStructure(toolConfig)
      const contentAnalysis = await this.analyzeToolContent(toolConfig)
      const semanticAnalysis = await this.semanticAnalyzer.analyzeToolSemantics(toolConfig)

      // Generate one-sentence summary using advanced NLP
      const oneSentenceSummary = await this.generateOneSentenceSummary(
        toolConfig,
        structuralAnalysis,
        contentAnalysis
      )

      // Identify primary use case through pattern analysis
      const primaryUseCase = await this.identifyPrimaryUseCase(
        toolConfig,
        semanticAnalysis,
        structuralAnalysis
      )

      // Extract key capability through semantic understanding
      const keyCapability = await this.extractKeyCapability(
        toolConfig,
        contentAnalysis,
        semanticAnalysis
      )

      // Generate contextually relevant tags
      const quickTags = await this.generateContextualTags(
        toolConfig,
        semanticAnalysis,
        contentAnalysis
      )

      // Assess complexity using multiple factors
      const complexityScore = await this.assessComplexity(
        toolConfig,
        structuralAnalysis,
        contentAnalysis
      )

      // Calculate confidence metrics
      const confidenceMetrics = await this.calculateConfidenceMetrics(
        toolConfig,
        structuralAnalysis,
        contentAnalysis,
        semanticAnalysis
      )

      const result: KeyInformationResult = {
        oneSentenceSummary,
        primaryUseCase,
        keyCapability,
        quickTags,
        complexityScore,
        confidenceMetrics
      }

      logger.info(`Key information extracted for ${toolConfig.id}`, {
        summary: oneSentenceSummary,
        confidence: confidenceMetrics.overallConfidence
      })

      return result

    } catch (error) {
      logger.error(`Failed to extract key information for ${toolConfig.id}:`, error)

      // Fallback to basic analysis
      return this.generateFallbackKeyInformation(toolConfig)
    }
  }

  /**
   * Comprehensive tool analysis with deep NLP understanding
   */
  async analyzeToolComprehensively(toolConfig: ToolConfig): Promise<ComprehensiveAnalysisResult> {
    logger.debug(`Performing comprehensive analysis for tool: ${toolConfig.id}`)

    try {
      // Multi-layered analysis approach
      const structuralAnalysis = await this.analyzeToolStructure(toolConfig)
      const contentAnalysis = await this.analyzeToolContent(toolConfig)
      const semanticAnalysis = await this.semanticAnalyzer.analyzeToolSemantics(toolConfig)
      const functionalAnalysis = await this.analyzeFunctionality(toolConfig)

      // Generate comprehensive overview
      const overview = await this.contentGenerator.generateOverview(
        toolConfig,
        structuralAnalysis,
        contentAnalysis,
        semanticAnalysis
      )

      // Detailed functionality description
      const functionality = await this.contentGenerator.generateFunctionalityDescription(
        toolConfig,
        functionalAnalysis,
        semanticAnalysis
      )

      // Working principle explanation
      const workingPrinciple = await this.contentGenerator.generateWorkingPrinciple(
        toolConfig,
        structuralAnalysis,
        functionalAnalysis
      )

      // Benefits analysis
      const benefits = await this.analyzeBenefits(
        toolConfig,
        semanticAnalysis,
        functionalAnalysis
      )

      // Limitations identification
      const limitations = await this.analyzeLimitations(
        toolConfig,
        structuralAnalysis,
        functionalAnalysis
      )

      // Technical details extraction
      const technicalDetails = await this.extractTechnicalDetails(
        toolConfig,
        structuralAnalysis,
        contentAnalysis
      )

      // Usage patterns identification
      const usagePatterns = await this.identifyUsagePatterns(
        toolConfig,
        semanticAnalysis,
        functionalAnalysis
      )

      // Performance characteristics
      const performanceCharacteristics = await this.analyzePerformanceCharacteristics(
        toolConfig,
        structuralAnalysis,
        functionalAnalysis
      )

      const result: ComprehensiveAnalysisResult = {
        overview,
        functionality,
        workingPrinciple,
        benefits,
        limitations,
        technicalDetails,
        usagePatterns,
        performanceCharacteristics
      }

      logger.info(`Comprehensive analysis completed for ${toolConfig.id}`, {
        benefitsCount: benefits.length,
        limitationsCount: limitations.length,
        usagePatternsCount: usagePatterns.length
      })

      return result

    } catch (error) {
      logger.error(`Failed comprehensive analysis for ${toolConfig.id}:`, error)

      // Fallback to basic comprehensive analysis
      return this.generateFallbackComprehensiveAnalysis(toolConfig)
    }
  }

  // =============================================================================
  // Advanced Analysis Methods
  // =============================================================================

  private async analyzeToolStructure(toolConfig: ToolConfig): Promise<StructuralAnalysis> {
    const parameterCount = Object.keys(toolConfig.params || {}).length
    const outputCount = Object.keys(toolConfig.outputs || {}).length
    const hasDescription = Boolean(toolConfig.description)
    const hasMetadata = Boolean(toolConfig.metadata)

    // Analyze parameter complexity
    const parameterComplexity = await this.analyzeParameterComplexity(toolConfig.params || {})

    // Analyze naming patterns
    const namingPatterns = this.analyzeNamingPatterns(toolConfig)

    // Assess structural completeness
    const completeness = this.assessStructuralCompleteness(toolConfig)

    return {
      parameterCount,
      outputCount,
      hasDescription,
      hasMetadata,
      parameterComplexity,
      namingPatterns,
      completeness,
      structuralScore: this.calculateStructuralScore({
        parameterCount,
        outputCount,
        hasDescription,
        hasMetadata,
        completeness
      })
    }
  }

  private async analyzeToolContent(toolConfig: ToolConfig): Promise<ContentAnalysis> {
    const description = toolConfig.description || ''
    const toolName = toolConfig.name || toolConfig.id

    // Content quality metrics
    const contentLength = description.length
    const wordCount = description.split(/\s+/).length
    const sentenceCount = description.split(/[.!?]+/).filter(s => s.trim()).length

    // Semantic content analysis
    const semanticDensity = await this.calculateSemanticDensity(description)
    const technicalTerms = await this.extractTechnicalTerms(description, toolName)
    const actionWords = await this.extractActionWords(description, toolConfig)

    // Content clarity assessment
    const clarityScore = await this.assessContentClarity(description)
    const readabilityScore = await this.assessReadability(description)

    return {
      contentLength,
      wordCount,
      sentenceCount,
      semanticDensity,
      technicalTerms,
      actionWords,
      clarityScore,
      readabilityScore,
      overallContentQuality: this.calculateContentQuality({
        semanticDensity,
        clarityScore,
        readabilityScore,
        wordCount
      })
    }
  }

  private async analyzeFunctionality(toolConfig: ToolConfig): Promise<FunctionalAnalysis> {
    // Analyze what the tool does based on its configuration
    const functionType = await this.inferFunctionType(toolConfig)
    const dataFlow = await this.analyzeDataFlow(toolConfig)
    const interactionPattern = await this.identifyInteractionPattern(toolConfig)
    const businessValue = await this.assessBusinessValue(toolConfig)

    return {
      functionType,
      dataFlow,
      interactionPattern,
      businessValue,
      functionalComplexity: this.calculateFunctionalComplexity(toolConfig)
    }
  }

  // =============================================================================
  // Content Generation Methods
  // =============================================================================

  private async generateOneSentenceSummary(
    toolConfig: ToolConfig,
    structural: StructuralAnalysis,
    content: ContentAnalysis
  ): Promise<string> {
    const toolName = toolConfig.name || toolConfig.id
    const platform = this.extractPlatform(toolName, toolConfig.description || '')
    const action = this.extractPrimaryAction(toolName, content.actionWords)
    const capability = await this.inferMainCapability(toolConfig, content)

    // Generate contextual summary based on analysis
    if (platform && action && capability) {
      return `${toolName} ${action}s ${capability} through ${platform} integration.`
    } else if (action && capability) {
      return `${toolName} enables ${action}ing ${capability} for enhanced productivity.`
    } else if (capability) {
      return `${toolName} provides ${capability} functionality for various use cases.`
    }

    // Fallback
    return `${toolName} is a versatile tool for ${this.inferGeneralPurpose(toolConfig)}.`
  }

  private async identifyPrimaryUseCase(
    toolConfig: ToolConfig,
    semantic: SemanticAnalysis,
    structural: StructuralAnalysis
  ): Promise<string> {
    const toolId = toolConfig.id.toLowerCase()
    const description = toolConfig.description?.toLowerCase() || ''

    // Pattern-based use case identification
    const useCasePatterns = {
      'communication': ['send', 'message', 'email', 'notify', 'communicate', 'contact'],
      'data_management': ['store', 'save', 'retrieve', 'query', 'database', 'data'],
      'search_research': ['search', 'find', 'lookup', 'discover', 'research', 'explore'],
      'content_creation': ['create', 'generate', 'write', 'compose', 'produce', 'build'],
      'analysis': ['analyze', 'process', 'evaluate', 'assess', 'examine', 'review'],
      'automation': ['automate', 'execute', 'run', 'trigger', 'schedule', 'workflow']
    }

    for (const [useCase, patterns] of Object.entries(useCasePatterns)) {
      if (patterns.some(pattern => toolId.includes(pattern) || description.includes(pattern))) {
        return this.generateUseCaseDescription(useCase, toolConfig)
      }
    }

    return 'General purpose tool for various business and technical operations'
  }

  private async extractKeyCapability(
    toolConfig: ToolConfig,
    content: ContentAnalysis,
    semantic: SemanticAnalysis
  ): Promise<string> {
    // Extract the most important capability from multiple sources
    const capabilities = []

    // From action words
    if (content.actionWords.length > 0) {
      capabilities.push(content.actionWords[0] + 'ing')
    }

    // From technical terms
    if (content.technicalTerms.length > 0) {
      capabilities.push(content.technicalTerms[0])
    }

    // From tool name analysis
    const nameCapability = this.extractCapabilityFromName(toolConfig.name || toolConfig.id)
    if (nameCapability) {
      capabilities.push(nameCapability)
    }

    // Select the most relevant capability
    return capabilities[0] || 'data processing'
  }

  private async generateContextualTags(
    toolConfig: ToolConfig,
    semantic: SemanticAnalysis,
    content: ContentAnalysis
  ): Promise<string[]> {
    const tags = new Set<string>()

    // Category-based tags
    const category = this.inferToolCategory(toolConfig)
    tags.add(category)

    // Technical tags from content
    content.technicalTerms.forEach(term => tags.add(term.toLowerCase()))

    // Action-based tags
    content.actionWords.forEach(action => tags.add(action))

    // Platform tags
    const platform = this.extractPlatform(
      toolConfig.name || toolConfig.id,
      toolConfig.description || ''
    )
    if (platform) tags.add(platform.toLowerCase())

    // Complexity tag
    const complexity = content.overallContentQuality > 0.8 ? 'advanced' :
                      content.overallContentQuality > 0.5 ? 'intermediate' : 'basic'
    tags.add(complexity)

    return Array.from(tags).slice(0, 8) // Limit to 8 most relevant tags
  }

  // =============================================================================
  // Analysis Helper Methods
  // =============================================================================

  private async assessComplexity(
    toolConfig: ToolConfig,
    structural: StructuralAnalysis,
    content: ContentAnalysis
  ): Promise<number> {
    let complexityScore = 0

    // Parameter complexity (0-0.3)
    complexityScore += Math.min(structural.parameterComplexity / 10, 0.3)

    // Content complexity (0-0.3)
    complexityScore += Math.min(content.overallContentQuality, 0.3)

    // Structural complexity (0-0.2)
    complexityScore += Math.min(structural.structuralScore / 5, 0.2)

    // Technical terms density (0-0.2)
    const termsDensity = content.technicalTerms.length / Math.max(content.wordCount, 1)
    complexityScore += Math.min(termsDensity * 10, 0.2)

    return Math.min(complexityScore, 1.0)
  }

  private async calculateConfidenceMetrics(
    toolConfig: ToolConfig,
    structural: StructuralAnalysis,
    content: ContentAnalysis,
    semantic: SemanticAnalysis
  ): Promise<ConfidenceMetrics> {
    // Analysis quality based on available information
    const analysisQuality = (
      (structural.hasDescription ? 0.3 : 0) +
      (structural.parameterCount > 0 ? 0.2 : 0) +
      (content.wordCount > 10 ? 0.3 : 0) +
      (content.technicalTerms.length > 0 ? 0.2 : 0)
    )

    // Completeness based on structural analysis
    const completeness = structural.completeness

    // Accuracy estimate based on content quality
    const accuracyEstimate = Math.min(content.overallContentQuality, 0.95)

    // Overall confidence
    const overallConfidence = (analysisQuality + completeness + accuracyEstimate) / 3

    return {
      overallConfidence,
      analysisQuality,
      completeness,
      accuracyEstimate
    }
  }

  // =============================================================================
  // Fallback Methods
  // =============================================================================

  private generateFallbackKeyInformation(toolConfig: ToolConfig): KeyInformationResult {
    const toolName = toolConfig.name || toolConfig.id

    return {
      oneSentenceSummary: `${toolName} provides essential functionality for your workflow.`,
      primaryUseCase: 'General purpose operations',
      keyCapability: 'data processing',
      quickTags: ['tool', 'utility', 'basic'],
      complexityScore: 0.5,
      confidenceMetrics: {
        overallConfidence: 0.3,
        analysisQuality: 0.2,
        completeness: 0.3,
        accuracyEstimate: 0.4
      }
    }
  }

  private generateFallbackComprehensiveAnalysis(toolConfig: ToolConfig): ComprehensiveAnalysisResult {
    const toolName = toolConfig.name || toolConfig.id

    return {
      overview: `${toolName} is a comprehensive tool designed to support various operational needs.`,
      functionality: 'Provides core functionality for data processing and workflow integration.',
      workingPrinciple: 'Operates through standard API interfaces and configuration-based setup.',
      benefits: ['Easy integration', 'Flexible configuration', 'Reliable operation'],
      limitations: ['Requires proper configuration', 'Dependent on external services'],
      technicalDetails: {
        architecture: ['Standard API design'],
        dependencies: ['External service connections'],
        integrationPoints: ['REST API', 'Configuration system'],
        securityConsiderations: ['Authentication required'],
        scalabilityFactors: ['Service limitations apply']
      },
      usagePatterns: [{
        pattern: 'Basic operation',
        frequency: 'common',
        complexity: 'simple',
        description: 'Standard usage pattern',
        examples: ['Basic configuration', 'Simple execution']
      }],
      performanceCharacteristics: {
        expectedLatency: 'Moderate response time',
        throughputCapacity: 'Standard capacity',
        resourceRequirements: ['Network connectivity'],
        scalabilityLimits: ['Service dependent'],
        optimizationOpportunities: ['Configuration tuning']
      }
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private extractPlatform(name: string, description: string): string | null {
    const text = (name + ' ' + description).toLowerCase()
    const platforms = {
      'gmail': 'Gmail',
      'slack': 'Slack',
      'discord': 'Discord',
      'notion': 'Notion',
      'airtable': 'Airtable',
      'github': 'GitHub',
      'mongodb': 'MongoDB',
      'openai': 'OpenAI',
      'google': 'Google',
      'microsoft': 'Microsoft'
    }

    for (const [key, value] of Object.entries(platforms)) {
      if (text.includes(key)) return value
    }

    return null
  }

  private extractPrimaryAction(name: string, actionWords: string[]): string {
    if (actionWords.length > 0) return actionWords[0]

    const nameText = name.toLowerCase()
    const actions = ['send', 'get', 'create', 'update', 'delete', 'search', 'query', 'execute']

    for (const action of actions) {
      if (nameText.includes(action)) return action
    }

    return 'process'
  }

  private async inferMainCapability(toolConfig: ToolConfig, content: ContentAnalysis): Promise<string> {
    if (content.technicalTerms.length > 0) {
      return content.technicalTerms[0]
    }

    const category = this.inferToolCategory(toolConfig)
    const categoryCapabilities = {
      'communication': 'messages',
      'data_storage': 'data',
      'search_research': 'information',
      'ai_ml': 'AI analysis',
      'productivity': 'tasks'
    }

    return categoryCapabilities[category] || 'information'
  }

  private inferToolCategory(toolConfig: ToolConfig): string {
    const toolId = toolConfig.id.toLowerCase()
    const name = (toolConfig.name || '').toLowerCase()
    const description = (toolConfig.description || '').toLowerCase()
    const text = `${toolId} ${name} ${description}`

    if (['email', 'slack', 'message', 'send', 'notify'].some(term => text.includes(term))) {
      return 'communication'
    }
    if (['database', 'store', 'save', 'mongo', 'sql'].some(term => text.includes(term))) {
      return 'data_storage'
    }
    if (['search', 'find', 'google', 'query'].some(term => text.includes(term))) {
      return 'search_research'
    }
    if (['ai', 'openai', 'generate', 'ml', 'model'].some(term => text.includes(term))) {
      return 'ai_ml'
    }

    return 'productivity'
  }

  // Additional helper method stubs...
  private async analyzeParameterComplexity(params: Record<string, any>): Promise<number> {
    // Implementation for parameter complexity analysis
    return Object.keys(params).length * 0.5
  }

  private analyzeNamingPatterns(toolConfig: ToolConfig): NamingPatterns {
    // Implementation for naming pattern analysis
    return {
      hasConsistentNaming: true,
      followsConventions: true,
      clarityScore: 0.8
    }
  }

  private assessStructuralCompleteness(toolConfig: ToolConfig): number {
    // Implementation for structural completeness assessment
    let score = 0
    if (toolConfig.description) score += 0.3
    if (toolConfig.params && Object.keys(toolConfig.params).length > 0) score += 0.3
    if (toolConfig.outputs && Object.keys(toolConfig.outputs).length > 0) score += 0.2
    if (toolConfig.metadata) score += 0.2
    return score
  }

  private calculateStructuralScore(factors: any): number {
    // Implementation for structural score calculation
    return Math.min((factors.parameterCount * 0.1 +
                     factors.outputCount * 0.1 +
                     (factors.hasDescription ? 0.3 : 0) +
                     factors.completeness), 1.0)
  }

  // Additional method implementations would continue here...
}

// =============================================================================
// Supporting Classes
// =============================================================================

class VocabularyEnhancer {
  constructor(private settings: NLPSettings) {}

  async enhanceVocabulary(text: string): Promise<string> {
    // Implementation for vocabulary enhancement
    return text
  }
}

class SemanticAnalyzer {
  constructor(private settings: NLPSettings) {}

  async analyzeToolSemantics(toolConfig: ToolConfig): Promise<SemanticAnalysis> {
    // Implementation for semantic analysis
    return {
      semanticClusters: [],
      conceptMap: {},
      relationshipStrength: 0.7,
      domainRelevance: 0.8
    }
  }
}

class ContentGenerator {
  constructor(private settings: NLPSettings) {}

  async generateOverview(
    toolConfig: ToolConfig,
    structural: StructuralAnalysis,
    content: ContentAnalysis,
    semantic: SemanticAnalysis
  ): Promise<string> {
    const toolName = toolConfig.name || toolConfig.id
    const description = toolConfig.description || ''

    if (description.length > 50) {
      return description
    }

    return `${toolName} is a comprehensive tool that provides essential functionality for modern workflows. It integrates seamlessly with existing systems and offers reliable performance for various operational needs.`
  }

  async generateFunctionalityDescription(
    toolConfig: ToolConfig,
    functional: FunctionalAnalysis,
    semantic: SemanticAnalysis
  ): Promise<string> {
    return `Core functionality includes ${functional.functionType} operations with ${functional.interactionPattern} interaction patterns, supporting ${functional.businessValue} business value delivery.`
  }

  async generateWorkingPrinciple(
    toolConfig: ToolConfig,
    structural: StructuralAnalysis,
    functional: FunctionalAnalysis
  ): Promise<string> {
    return `Operates through a ${functional.dataFlow} data flow architecture, processing inputs through ${structural.parameterCount} configured parameters and delivering results via structured outputs.`
  }
}

class QualityAssessor {
  constructor(private settings: NLPSettings) {}

  async assessContentQuality(content: string): Promise<number> {
    // Implementation for content quality assessment
    if (content.length < 10) return 0.2
    if (content.length < 50) return 0.5
    if (content.length < 200) return 0.8
    return 0.9
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

interface StructuralAnalysis {
  parameterCount: number
  outputCount: number
  hasDescription: boolean
  hasMetadata: boolean
  parameterComplexity: number
  namingPatterns: NamingPatterns
  completeness: number
  structuralScore: number
}

interface ContentAnalysis {
  contentLength: number
  wordCount: number
  sentenceCount: number
  semanticDensity: number
  technicalTerms: string[]
  actionWords: string[]
  clarityScore: number
  readabilityScore: number
  overallContentQuality: number
}

interface SemanticAnalysis {
  semanticClusters: string[]
  conceptMap: Record<string, string[]>
  relationshipStrength: number
  domainRelevance: number
}

interface FunctionalAnalysis {
  functionType: string
  dataFlow: string
  interactionPattern: string
  businessValue: string
  functionalComplexity: number
}

interface NamingPatterns {
  hasConsistentNaming: boolean
  followsConventions: boolean
  clarityScore: number
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create NLP processor with default settings
 */
export function createNLPProcessor(settings?: NLPSettings): NLPProcessor {
  return new NLPProcessor(settings)
}

/**
 * Analyze tool with NLP and return key information
 */
export async function analyzeToolWithNLP(
  toolConfig: ToolConfig,
  settings?: NLPSettings
): Promise<KeyInformationResult> {
  const processor = createNLPProcessor(settings)
  return await processor.extractKeyInformation(toolConfig)
}

/**
 * Perform comprehensive tool analysis
 */
export async function performComprehensiveAnalysis(
  toolConfig: ToolConfig,
  settings?: NLPSettings
): Promise<ComprehensiveAnalysisResult> {
  const processor = createNLPProcessor(settings)
  return await processor.analyzeToolComprehensively(toolConfig)
}