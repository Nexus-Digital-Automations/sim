/**
 * Best Practices Knowledge Base
 *
 * Comprehensive repository of usage patterns, best practices, troubleshooting
 * guides, and optimization tips for all tools in the Universal Tool Adapter system.
 *
 * @author USAGE_GUIDELINES_SYSTEM_AGENT
 * @version 1.0.0
 */

import { Logger } from '../utils/logger'

// =============================================================================
// Knowledge Base Core Types
// =============================================================================

export interface KnowledgeEntry {
  id: string
  type: KnowledgeType
  title: string
  description: string
  content: KnowledgeContent
  metadata: KnowledgeMetadata
  relationships: KnowledgeRelationships
  applicability: ApplicabilityRules
}

export type KnowledgeType =
  | 'best-practice'
  | 'common-pattern'
  | 'anti-pattern'
  | 'troubleshooting-guide'
  | 'optimization-tip'
  | 'integration-pattern'
  | 'security-guideline'
  | 'performance-tip'
  | 'workflow-pattern'
  | 'error-resolution'

export interface KnowledgeContent {
  // Core content structure
  summary: string
  detailed: DetailedContent
  examples: ExampleCollection
  implementation: ImplementationGuide
  validation: ValidationCriteria
  resources: ResourceCollection
}

export interface DetailedContent {
  description: string
  rationale: string
  benefits: Benefit[]
  drawbacks: Drawback[]
  alternatives: Alternative[]
  prerequisites: Prerequisite[]
  constraints: Constraint[]
}

export interface Benefit {
  category: 'performance' | 'security' | 'usability' | 'maintainability' | 'reliability' | 'cost'
  description: string
  quantifiable?: {
    metric: string
    improvement: string
    evidence?: string
  }
}

export interface Drawback {
  category: 'complexity' | 'performance' | 'cost' | 'compatibility' | 'risk'
  description: string
  severity: 'low' | 'medium' | 'high'
  mitigation?: string[]
}

export interface Alternative {
  name: string
  description: string
  whenToUse: string
  tradeoffs: string[]
  implementationDifference: string
}

export interface Prerequisite {
  type: 'knowledge' | 'tool' | 'permission' | 'configuration' | 'data'
  description: string
  howToFulfill: string[]
  validationMethod?: string
}

export interface Constraint {
  type: 'technical' | 'business' | 'regulatory' | 'resource'
  description: string
  impact: string
  workarounds?: string[]
}

export interface ExampleCollection {
  basic: CodeExample[]
  intermediate: CodeExample[]
  advanced: CodeExample[]
  realWorld: RealWorldExample[]
  antiExamples: AntiExample[]
}

export interface CodeExample {
  title: string
  description: string
  language?: string
  code: string
  explanation: string[]
  variations: CodeVariation[]
  commonIssues: string[]
  testingApproach?: string
}

export interface CodeVariation {
  name: string
  description: string
  code: string
  whenToUse: string
}

export interface RealWorldExample {
  title: string
  scenario: string
  industry?: string
  context: {
    teamSize: string
    timeline: string
    constraints: string[]
    requirements: string[]
  }
  implementation: {
    approach: string
    tools: string[]
    steps: string[]
    challenges: string[]
    solutions: string[]
  }
  results: {
    outcomes: string[]
    metrics?: Record<string, string>
    learnings: string[]
    recommendations: string[]
  }
}

export interface AntiExample {
  title: string
  description: string
  whatNotToDo: string
  whyItsBad: string[]
  correctApproach: string
  code?: {
    wrong: string
    right: string
  }
}

export interface ImplementationGuide {
  overview: string
  steps: ImplementationStep[]
  checkpoints: Checkpoint[]
  rollback: RollbackProcedure
  automation: AutomationOptions
}

export interface ImplementationStep {
  stepNumber: number
  title: string
  description: string
  actions: string[]
  expectedOutcome: string
  troubleshooting: TroubleshootingTip[]
  verification: string[]
  dependencies?: string[]
  estimatedTime?: string
}

export interface Checkpoint {
  name: string
  description: string
  criteria: string[]
  automatedCheck?: string
  manualVerification?: string[]
  failureConsequences: string
  recoverySteps: string[]
}

export interface RollbackProcedure {
  description: string
  triggers: string[]
  steps: string[]
  dataBackup: string[]
  verification: string[]
  timeEstimate: string
}

export interface AutomationOptions {
  available: boolean
  tools: string[]
  scripts: ScriptReference[]
  cicdIntegration?: string[]
  monitoring?: string[]
}

export interface ScriptReference {
  name: string
  description: string
  language: string
  location: string
  parameters: string[]
  usage: string
}

export interface ValidationCriteria {
  functional: FunctionalValidation[]
  performance: PerformanceValidation[]
  security: SecurityValidation[]
  usability: UsabilityValidation[]
}

export interface FunctionalValidation {
  aspect: string
  criteria: string
  testMethod: string
  expectedResult: string
  automatedTest?: string
}

export interface PerformanceValidation {
  metric: string
  target: string
  measurementMethod: string
  tools: string[]
  acceptanceCriteria: string
}

export interface SecurityValidation {
  concern: string
  validation: string
  tools: string[]
  frequency: string
  remediationSteps?: string[]
}

export interface UsabilityValidation {
  aspect: string
  criteria: string
  method: 'user-testing' | 'heuristic-evaluation' | 'accessibility-audit' | 'cognitive-walkthrough'
  participants?: string
  metrics: string[]
}

export interface ResourceCollection {
  documentation: DocumentationLink[]
  tools: ToolReference[]
  learning: LearningResource[]
  community: CommunityResource[]
  standards: StandardReference[]
}

export interface DocumentationLink {
  title: string
  url: string
  type: 'official' | 'tutorial' | 'reference' | 'guide' | 'specification'
  description: string
  relevance: 'high' | 'medium' | 'low'
  lastUpdated?: Date
}

export interface ToolReference {
  name: string
  description: string
  category: string
  url?: string
  cost: 'free' | 'freemium' | 'paid'
  platforms: string[]
  integrations: string[]
}

export interface LearningResource {
  title: string
  type: 'course' | 'tutorial' | 'book' | 'video' | 'workshop' | 'certification'
  provider: string
  url?: string
  duration?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  cost: 'free' | 'paid'
}

export interface CommunityResource {
  name: string
  type: 'forum' | 'slack' | 'discord' | 'stackoverflow' | 'reddit' | 'github'
  url: string
  description: string
  activity: 'high' | 'medium' | 'low'
  expertise: 'beginner-friendly' | 'mixed' | 'expert-level'
}

export interface StandardReference {
  name: string
  organization: string
  version: string
  url: string
  relevance: string
  complianceRequired: boolean
}

export interface KnowledgeMetadata {
  // Authoring information
  author: string
  contributors: string[]
  reviewers: string[]
  approver?: string
  dateCreated: Date
  lastUpdated: Date

  // Quality metrics
  quality: QualityMetrics
  usage: UsageMetrics
  feedback: FeedbackMetrics

  // Classification
  tags: string[]
  categories: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  maturity: 'experimental' | 'proven' | 'standard' | 'deprecated'
  stability: 'draft' | 'stable' | 'mature' | 'legacy'

  // Context
  domain: string[]  // Software development, data science, etc.
  industry: string[]  // Healthcare, finance, etc.
  toolCompatibility: string[]
  versionCompatibility: string[]
}

export interface QualityMetrics {
  completeness: number  // 0-1
  accuracy: number     // 0-1
  clarity: number      // 0-1
  usefulness: number   // 0-1
  upToDate: number     // 0-1
}

export interface UsageMetrics {
  viewCount: number
  implementationCount: number
  successRate: number
  averageRating: number
  ratingCount: number
  bookmarkCount: number
  shareCount: number
}

export interface FeedbackMetrics {
  positiveReviews: number
  negativeReviews: number
  suggestions: string[]
  commonQuestions: string[]
  improvementRequests: string[]
}

export interface KnowledgeRelationships {
  // Hierarchical relationships
  parentTopics: string[]
  subTopics: string[]

  // Associative relationships
  relatedEntries: string[]
  prerequisites: string[]
  dependents: string[]
  alternatives: string[]
  conflicts: string[]

  // Sequential relationships
  followsAfter: string[]
  followsBefore: string[]

  // Contextual relationships
  complementaryWith: string[]
  supersedes: string[]
  supersededBy: string[]
}

export interface ApplicabilityRules {
  // Tool-specific applicability
  tools: ToolApplicability[]

  // Context-based applicability
  contexts: ContextApplicability[]

  // User-based applicability
  userProfiles: UserProfileApplicability[]

  // Situational applicability
  situations: SituationalApplicability[]
}

export interface ToolApplicability {
  toolId: string
  toolName: string
  versions?: string[]
  configurations?: string[]
  integrations?: string[]
  applicabilityScore: number  // 0-1
  notes?: string
}

export interface ContextApplicability {
  contextType: string
  conditions: ApplicabilityCondition[]
  weight: number
}

export interface ApplicabilityCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range' | 'matches'
  value: any
  description?: string
}

export interface UserProfileApplicability {
  userType: string[]
  experience: ('novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert')[]
  roles: string[]
  industries: string[]
  teamSize?: number
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
}

export interface SituationalApplicability {
  urgency: ('low' | 'medium' | 'high' | 'critical')[]
  complexity: ('simple' | 'moderate' | 'complex' | 'very-complex')[]
  riskTolerance: ('low' | 'medium' | 'high')[]
  timeAvailability: ('limited' | 'moderate' | 'abundant')[]
  resourceAvailability: ('constrained' | 'normal' | 'abundant')[]
}

export interface TroubleshootingTip {
  issue: string
  symptoms: string[]
  cause: string
  solution: string[]
  prevention?: string[]
}

// =============================================================================
// Knowledge Base Management System
// =============================================================================

export class KnowledgeBase {
  private entries: Map<string, KnowledgeEntry> = new Map()
  private indexByType: Map<KnowledgeType, Set<string>> = new Map()
  private indexByTool: Map<string, Set<string>> = new Map()
  private indexByTag: Map<string, Set<string>> = new Map()
  private indexByDomain: Map<string, Set<string>> = new Map()
  private logger: Logger

  constructor() {
    this.logger = new Logger('KnowledgeBase')
    this.initializeIndexes()
    this.loadStandardKnowledge()
  }

  /**
   * Add a new knowledge entry
   */
  addEntry(entry: KnowledgeEntry): void {
    this.entries.set(entry.id, entry)
    this.updateIndexes(entry)

    this.logger.info('Added knowledge entry', {
      id: entry.id,
      type: entry.type,
      title: entry.title
    })
  }

  /**
   * Get a knowledge entry by ID
   */
  getEntry(id: string): KnowledgeEntry | null {
    return this.entries.get(id) || null
  }

  /**
   * Search knowledge entries
   */
  search(query: KnowledgeSearchQuery): KnowledgeSearchResult[] {
    let candidateIds = new Set(this.entries.keys())

    // Filter by type
    if (query.types && query.types.length > 0) {
      const typeIds = new Set<string>()
      query.types.forEach(type => {
        const ids = this.indexByType.get(type)
        if (ids) {
          ids.forEach(id => typeIds.add(id))
        }
      })
      candidateIds = new Set([...candidateIds].filter(id => typeIds.has(id)))
    }

    // Filter by tool
    if (query.toolIds && query.toolIds.length > 0) {
      const toolIds = new Set<string>()
      query.toolIds.forEach(toolId => {
        const ids = this.indexByTool.get(toolId)
        if (ids) {
          ids.forEach(id => toolIds.add(id))
        }
      })
      candidateIds = new Set([...candidateIds].filter(id => toolIds.has(id)))
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      query.tags.forEach(tag => {
        const tagIds = this.indexByTag.get(tag)
        if (tagIds) {
          candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)))
        }
      })
    }

    // Filter by domain
    if (query.domains && query.domains.length > 0) {
      const domainIds = new Set<string>()
      query.domains.forEach(domain => {
        const ids = this.indexByDomain.get(domain)
        if (ids) {
          ids.forEach(id => domainIds.add(id))
        }
      })
      candidateIds = new Set([...candidateIds].filter(id => domainIds.has(id)))
    }

    // Convert to entries and apply additional filters
    let results = [...candidateIds]
      .map(id => this.entries.get(id)!)
      .filter(entry => this.matchesTextQuery(entry, query.textQuery))
      .filter(entry => this.matchesDifficulty(entry, query.difficulty))
      .filter(entry => this.matchesMaturity(entry, query.maturity))

    // Apply context-based filtering
    if (query.context) {
      results = results.filter(entry => this.isApplicableToContext(entry, query.context!))
    }

    // Score and rank results
    const scoredResults = results.map(entry => ({
      entry,
      score: this.calculateRelevanceScore(entry, query)
    }))

    // Sort by relevance and apply pagination
    const sortedResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(query.offset || 0, (query.offset || 0) + (query.limit || 20))

    return sortedResults.map(({ entry, score }) => ({
      entry,
      relevanceScore: score,
      matchReasons: this.getMatchReasons(entry, query)
    }))
  }

  /**
   * Get knowledge entries by pattern
   */
  getByPattern(pattern: KnowledgePattern): KnowledgeEntry[] {
    return this.search({
      types: [pattern.type],
      tags: pattern.tags,
      difficulty: pattern.difficulty,
      limit: 50
    }).map(result => result.entry)
  }

  /**
   * Get best practices for a specific tool
   */
  getBestPractices(toolId: string, category?: string): KnowledgeEntry[] {
    const query: KnowledgeSearchQuery = {
      types: ['best-practice'],
      toolIds: [toolId],
      tags: category ? [category] : undefined,
      maturity: ['proven', 'standard']
    }

    return this.search(query).map(result => result.entry)
  }

  /**
   * Get troubleshooting guides for common issues
   */
  getTroubleshootingGuides(
    toolId?: string,
    issueCategory?: string
  ): KnowledgeEntry[] {
    const query: KnowledgeSearchQuery = {
      types: ['troubleshooting-guide', 'error-resolution'],
      toolIds: toolId ? [toolId] : undefined,
      tags: issueCategory ? [issueCategory] : undefined
    }

    return this.search(query).map(result => result.entry)
  }

  /**
   * Get optimization tips
   */
  getOptimizationTips(
    toolId?: string,
    optimizationType?: 'performance' | 'usability' | 'security'
  ): KnowledgeEntry[] {
    const tags = optimizationType ? [optimizationType] : ['performance', 'usability', 'security']

    const query: KnowledgeSearchQuery = {
      types: ['optimization-tip', 'performance-tip'],
      toolIds: toolId ? [toolId] : undefined,
      tags
    }

    return this.search(query).map(result => result.entry)
  }

  /**
   * Get integration patterns
   */
  getIntegrationPatterns(toolId?: string): KnowledgeEntry[] {
    const query: KnowledgeSearchQuery = {
      types: ['integration-pattern', 'workflow-pattern'],
      toolIds: toolId ? [toolId] : undefined
    }

    return this.search(query).map(result => result.entry)
  }

  /**
   * Update usage metrics for an entry
   */
  updateUsageMetrics(entryId: string, metrics: Partial<UsageMetrics>): void {
    const entry = this.entries.get(entryId)
    if (!entry) return

    Object.assign(entry.metadata.usage, metrics)
    entry.metadata.lastUpdated = new Date()

    this.logger.debug('Updated usage metrics', {
      entryId,
      metrics
    })
  }

  /**
   * Add feedback to an entry
   */
  addFeedback(entryId: string, feedback: KnowledgeFeedback): void {
    const entry = this.entries.get(entryId)
    if (!entry) return

    if (feedback.rating > 3) {
      entry.metadata.feedback.positiveReviews++
    } else {
      entry.metadata.feedback.negativeReviews++
    }

    if (feedback.comment) {
      if (feedback.type === 'suggestion') {
        entry.metadata.feedback.suggestions.push(feedback.comment)
      } else if (feedback.type === 'question') {
        entry.metadata.feedback.commonQuestions.push(feedback.comment)
      } else if (feedback.type === 'improvement') {
        entry.metadata.feedback.improvementRequests.push(feedback.comment)
      }
    }

    // Recalculate quality metrics
    this.recalculateQualityMetrics(entry)

    this.logger.info('Added feedback to knowledge entry', {
      entryId,
      feedbackType: feedback.type,
      rating: feedback.rating
    })
  }

  // Private helper methods
  private initializeIndexes(): void {
    // Initialize type index
    const knowledgeTypes: KnowledgeType[] = [
      'best-practice', 'common-pattern', 'anti-pattern', 'troubleshooting-guide',
      'optimization-tip', 'integration-pattern', 'security-guideline',
      'performance-tip', 'workflow-pattern', 'error-resolution'
    ]

    knowledgeTypes.forEach(type => {
      this.indexByType.set(type, new Set())
    })
  }

  private updateIndexes(entry: KnowledgeEntry): void {
    // Update type index
    let typeSet = this.indexByType.get(entry.type)
    if (!typeSet) {
      typeSet = new Set()
      this.indexByType.set(entry.type, typeSet)
    }
    typeSet.add(entry.id)

    // Update tool index
    entry.applicability.tools.forEach(tool => {
      let toolSet = this.indexByTool.get(tool.toolId)
      if (!toolSet) {
        toolSet = new Set()
        this.indexByTool.set(tool.toolId, toolSet)
      }
      toolSet.add(entry.id)
    })

    // Update tag index
    entry.metadata.tags.forEach(tag => {
      let tagSet = this.indexByTag.get(tag)
      if (!tagSet) {
        tagSet = new Set()
        this.indexByTag.set(tag, tagSet)
      }
      tagSet.add(entry.id)
    })

    // Update domain index
    entry.metadata.domain.forEach(domain => {
      let domainSet = this.indexByDomain.get(domain)
      if (!domainSet) {
        domainSet = new Set()
        this.indexByDomain.set(domain, domainSet)
      }
      domainSet.add(entry.id)
    })
  }

  private matchesTextQuery(entry: KnowledgeEntry, query?: string): boolean {
    if (!query) return true

    const searchText = `${entry.title} ${entry.description} ${entry.content.summary}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
  }

  private matchesDifficulty(
    entry: KnowledgeEntry,
    difficulty?: ('beginner' | 'intermediate' | 'advanced' | 'expert')[]
  ): boolean {
    if (!difficulty || difficulty.length === 0) return true
    return difficulty.includes(entry.metadata.difficulty)
  }

  private matchesMaturity(
    entry: KnowledgeEntry,
    maturity?: ('experimental' | 'proven' | 'standard' | 'deprecated')[]
  ): boolean {
    if (!maturity || maturity.length === 0) return true
    return maturity.includes(entry.metadata.maturity)
  }

  private isApplicableToContext(entry: KnowledgeEntry, context: any): boolean {
    // Simplified context matching
    return true
  }

  private calculateRelevanceScore(entry: KnowledgeEntry, query: KnowledgeSearchQuery): number {
    let score = 0

    // Base score from quality metrics
    score += entry.metadata.quality.usefulness * 0.3
    score += entry.metadata.quality.accuracy * 0.2
    score += entry.metadata.quality.clarity * 0.1

    // Usage-based scoring
    score += Math.min(entry.metadata.usage.averageRating / 5, 1) * 0.2
    score += Math.min(entry.metadata.usage.implementationCount / 100, 1) * 0.1

    // Recency scoring
    const daysSinceUpdate = (Date.now() - entry.metadata.lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    score += Math.max(0, 1 - daysSinceUpdate / 365) * 0.1

    return Math.min(score, 1)
  }

  private getMatchReasons(entry: KnowledgeEntry, query: KnowledgeSearchQuery): string[] {
    const reasons: string[] = []

    if (query.types?.includes(entry.type)) {
      reasons.push(`Matches type: ${entry.type}`)
    }

    if (query.tags?.some(tag => entry.metadata.tags.includes(tag))) {
      reasons.push('Matches tags')
    }

    if (query.toolIds?.some(toolId =>
      entry.applicability.tools.some(tool => tool.toolId === toolId)
    )) {
      reasons.push('Applicable to requested tools')
    }

    return reasons
  }

  private recalculateQualityMetrics(entry: KnowledgeEntry): void {
    const feedback = entry.metadata.feedback
    const usage = entry.metadata.usage

    // Update usefulness based on ratings
    if (usage.ratingCount > 0) {
      entry.metadata.quality.usefulness = usage.averageRating / 5
    }

    // Update accuracy based on feedback
    const totalFeedback = feedback.positiveReviews + feedback.negativeReviews
    if (totalFeedback > 0) {
      entry.metadata.quality.accuracy = feedback.positiveReviews / totalFeedback
    }
  }

  private loadStandardKnowledge(): void {
    // Load predefined knowledge entries
    this.loadBestPractices()
    this.loadCommonPatterns()
    this.loadTroubleshootingGuides()
    this.loadOptimizationTips()
  }

  private loadBestPractices(): void {
    // Implementation would load from configuration files or database
  }

  private loadCommonPatterns(): void {
    // Implementation would load from configuration files or database
  }

  private loadTroubleshootingGuides(): void {
    // Implementation would load from configuration files or database
  }

  private loadOptimizationTips(): void {
    // Implementation would load from configuration files or database
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface KnowledgeSearchQuery {
  textQuery?: string
  types?: KnowledgeType[]
  toolIds?: string[]
  tags?: string[]
  domains?: string[]
  difficulty?: ('beginner' | 'intermediate' | 'advanced' | 'expert')[]
  maturity?: ('experimental' | 'proven' | 'standard' | 'deprecated')[]
  context?: any
  limit?: number
  offset?: number
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry
  relevanceScore: number
  matchReasons: string[]
}

export interface KnowledgePattern {
  type: KnowledgeType
  tags?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  domain?: string
}

export interface KnowledgeFeedback {
  userId: string
  rating: number  // 1-5
  type: 'general' | 'suggestion' | 'question' | 'improvement' | 'correction'
  comment?: string
  timestamp: Date
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createKnowledgeBase(): KnowledgeBase {
  return new KnowledgeBase()
}

export function createKnowledgeEntry(
  type: KnowledgeType,
  title: string,
  content: Partial<KnowledgeContent>
): Partial<KnowledgeEntry> {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description: content.summary || title,
    content: {
      summary: content.summary || '',
      detailed: content.detailed || {
        description: '',
        rationale: '',
        benefits: [],
        drawbacks: [],
        alternatives: [],
        prerequisites: [],
        constraints: []
      },
      examples: content.examples || {
        basic: [],
        intermediate: [],
        advanced: [],
        realWorld: [],
        antiExamples: []
      },
      implementation: content.implementation || {
        overview: '',
        steps: [],
        checkpoints: [],
        rollback: {
          description: '',
          triggers: [],
          steps: [],
          dataBackup: [],
          verification: [],
          timeEstimate: ''
        },
        automation: {
          available: false,
          tools: [],
          scripts: []
        }
      },
      validation: content.validation || {
        functional: [],
        performance: [],
        security: [],
        usability: []
      },
      resources: content.resources || {
        documentation: [],
        tools: [],
        learning: [],
        community: [],
        standards: []
      }
    },
    metadata: {
      author: 'System Generated',
      contributors: [],
      reviewers: [],
      dateCreated: new Date(),
      lastUpdated: new Date(),
      quality: {
        completeness: 0.7,
        accuracy: 0.8,
        clarity: 0.7,
        usefulness: 0.7,
        upToDate: 1.0
      },
      usage: {
        viewCount: 0,
        implementationCount: 0,
        successRate: 0,
        averageRating: 0,
        ratingCount: 0,
        bookmarkCount: 0,
        shareCount: 0
      },
      feedback: {
        positiveReviews: 0,
        negativeReviews: 0,
        suggestions: [],
        commonQuestions: [],
        improvementRequests: []
      },
      tags: [],
      categories: [],
      difficulty: 'beginner',
      maturity: 'experimental',
      stability: 'draft',
      domain: [],
      industry: [],
      toolCompatibility: [],
      versionCompatibility: []
    },
    relationships: {
      parentTopics: [],
      subTopics: [],
      relatedEntries: [],
      prerequisites: [],
      dependents: [],
      alternatives: [],
      conflicts: [],
      followsAfter: [],
      followsBefore: [],
      complementaryWith: [],
      supersedes: [],
      supersededBy: []
    },
    applicability: {
      tools: [],
      contexts: [],
      userProfiles: [],
      situations: []
    }
  }
}