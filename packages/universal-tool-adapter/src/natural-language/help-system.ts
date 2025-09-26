/**
 * Natural Language Help System
 *
 * Intelligent help system that understands natural language queries about tools
 * and provides contextual assistance, tutorials, and troubleshooting guidance.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

import type { ConversationMessage, UsageContext, UserIntent } from './usage-guidelines'

// Re-export ConversationExample for external use
export type { ConversationExample } from './usage-guidelines'

// =============================================================================
// Help System Types
// =============================================================================

export interface HelpQuery {
  userMessage: string
  context?: UsageContext
  conversationHistory?: ConversationMessage[]
  specificTool?: string
  queryType?: 'how-to' | 'what-is' | 'when-to-use' | 'troubleshoot' | 'compare' | 'general'
}

export interface HelpResponse {
  answer: string
  type: 'explanation' | 'tutorial' | 'troubleshooting' | 'recommendation' | 'comparison'
  confidence: number

  // Supporting content
  relatedHelp?: RelatedHelpItem[]
  quickActions?: QuickAction[]
  tutorials?: Tutorial[]
  examples?: HelpExample[]

  // Interactive elements
  followUpQuestions?: string[]
  suggestedQueries?: string[]

  // Metadata
  sources?: string[]
  lastUpdated?: Date
  helpfulnessScore?: number
}

export interface RelatedHelpItem {
  title: string
  description: string
  query: string
  relevance: number
}

export interface QuickAction {
  label: string
  action: 'search' | 'tutorial' | 'tool' | 'example' | 'contact'
  target: string
  description?: string
}

export interface Tutorial {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  steps: TutorialStep[]
  prerequisites?: string[]
  tools: string[]
}

export interface TutorialStep {
  stepNumber: number
  title: string
  description: string
  code?: string
  image?: string
  tips?: string[]
  warnings?: string[]
  expectedOutcome?: string
}

export interface HelpExample {
  scenario: string
  userInput: string
  explanation: string
  toolUsed?: string
  parameters?: Record<string, any>
  outcome: string
}

export interface HelpKnowledgeBase {
  // Tool-specific help
  toolHelp: Map<string, ToolHelp>

  // General help topics
  generalTopics: Map<string, HelpTopic>

  // Tutorials and guides
  tutorials: Map<string, Tutorial>

  // FAQ and common issues
  faq: FAQItem[]
  commonIssues: Map<string, TroubleshootingGuide>

  // User guides by experience level
  beginnerGuides: string[]
  advancedGuides: string[]

  // Search index
  searchIndex: HelpSearchIndex
}

export interface ToolHelp {
  toolId: string
  overview: string
  purpose: string
  whenToUse: string[]
  whenNotToUse: string[]

  // Parameter guidance
  parameters: ParameterHelp[]

  // Usage examples
  examples: HelpExample[]

  // Common patterns
  commonUseCases: UseCase[]

  // Troubleshooting
  commonIssues: string[]
  troubleshooting: TroubleshootingGuide

  // Best practices
  bestPractices: string[]
  tips: string[]
  warnings: string[]

  // Integration guidance
  worksWellWith: string[]
  alternatives: string[]
}

export interface ParameterHelp {
  name: string
  type: string
  required: boolean
  description: string
  examples: string[]
  validation?: string
  tips?: string[]
  commonMistakes?: string[]
}

export interface UseCase {
  title: string
  description: string
  scenario: string
  steps: string[]
  expectedOutcome: string
  difficulty: 'easy' | 'moderate' | 'challenging'
}

export interface HelpTopic {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  relatedTopics: string[]
  lastUpdated: Date
}

export interface FAQItem {
  question: string
  answer: string
  category: string
  popularity: number
  keywords: string[]
  relatedTools?: string[]
}

export interface TroubleshootingGuide {
  commonProblems: Problem[]
  diagnosticQuestions: string[]
  generalTips: string[]
}

export interface Problem {
  symptom: string
  possibleCauses: string[]
  solutions: Solution[]
  relatedProblems?: string[]
}

export interface Solution {
  description: string
  steps: string[]
  success_indicators: string[]
  difficulty: 'easy' | 'moderate' | 'difficult'
}

// =============================================================================
// Help System Implementation
// =============================================================================

export class NaturalLanguageHelpSystem {
  private knowledgeBase: HelpKnowledgeBase
  private queryClassifier: HelpQueryClassifier
  private responseGenerator: HelpResponseGenerator
  private searchEngine: HelpSearchEngine
  private tutorialManager: TutorialManager

  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase()
    this.queryClassifier = new HelpQueryClassifier()
    this.responseGenerator = new HelpResponseGenerator(this.knowledgeBase)
    this.searchEngine = new HelpSearchEngine(this.knowledgeBase)
    this.tutorialManager = new TutorialManager(this.knowledgeBase)
  }

  /**
   * Process a natural language help query
   */
  async processHelpQuery(query: HelpQuery): Promise<HelpResponse> {
    try {
      // Step 1: Classify the query type and extract intent
      const classification = await this.queryClassifier.classifyQuery(query)

      // Step 2: Search for relevant help content
      const searchResults = await this.searchEngine.search(query, classification)

      // Step 3: Generate comprehensive response
      const response = await this.responseGenerator.generateResponse(
        query,
        classification,
        searchResults
      )

      // Step 4: Add interactive elements
      await this.enhanceWithInteractiveElements(response, query, classification)

      return response
    } catch (error) {
      console.error('Help query processing failed:', error)
      return this.generateErrorResponse(query, error as Error)
    }
  }

  /**
   * Get contextual help for a specific tool
   */
  async getToolHelp(
    toolId: string,
    context?: UsageContext,
    specificQuestion?: string
  ): Promise<HelpResponse> {
    const toolHelp = this.knowledgeBase.toolHelp.get(toolId)

    if (!toolHelp) {
      return {
        answer: `I don't have specific help information for the tool "${toolId}". Please check if the tool ID is correct or try asking about general tool usage.`,
        type: 'explanation',
        confidence: 0.1,
      }
    }

    return this.responseGenerator.generateToolSpecificResponse(toolHelp, context, specificQuestion)
  }

  /**
   * Get step-by-step tutorial for a task
   */
  async getTutorial(
    taskDescription: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
    context?: UsageContext
  ): Promise<Tutorial | null> {
    return this.tutorialManager.findBestTutorial(taskDescription, userLevel, context)
  }

  /**
   * Get troubleshooting help
   */
  async getTroubleshootingHelp(
    problem: string,
    toolId?: string,
    context?: UsageContext
  ): Promise<HelpResponse> {
    const troubleshootingGuide = toolId
      ? this.knowledgeBase.toolHelp.get(toolId)?.troubleshooting
      : await this.findGeneralTroubleshooting(problem)

    if (!troubleshootingGuide) {
      return {
        answer:
          "I couldn't find specific troubleshooting information for this problem. Please provide more details about what you're experiencing.",
        type: 'troubleshooting',
        confidence: 0.2,
        followUpQuestions: [
          'What exactly happened when you tried to use the tool?',
          'What error messages did you see?',
          'What were you trying to accomplish?',
        ],
      }
    }

    return this.responseGenerator.generateTroubleshootingResponse(
      troubleshootingGuide,
      problem,
      context
    )
  }

  /**
   * Compare tools and provide guidance on which to use
   */
  async compareTools(
    tools: string[],
    criteria?: string,
    context?: UsageContext
  ): Promise<HelpResponse> {
    const toolComparisons = await Promise.all(
      tools.map((toolId) => this.knowledgeBase.toolHelp.get(toolId))
    )

    return this.responseGenerator.generateComparisonResponse(
      toolComparisons.filter(Boolean) as ToolHelp[],
      criteria,
      context
    )
  }

  /**
   * Suggest help topics based on user behavior
   */
  async suggestHelpTopics(context: UsageContext): Promise<RelatedHelpItem[]> {
    const suggestions: RelatedHelpItem[] = []

    // Recent tool usage based suggestions
    if (context.messageHistory) {
      const recentTools = this.extractRecentTools(context.messageHistory)
      for (const toolId of recentTools) {
        const toolHelp = this.knowledgeBase.toolHelp.get(toolId)
        if (toolHelp) {
          suggestions.push({
            title: `Advanced tips for ${toolId}`,
            description: `Learn advanced techniques and best practices`,
            query: `how to use ${toolId} effectively`,
            relevance: 0.8,
          })
        }
      }
    }

    // User profile based suggestions
    if (context.userProfile?.experience === 'beginner') {
      suggestions.push(...this.getBeginnerSuggestions())
    } else if (context.userProfile?.experience === 'advanced') {
      suggestions.push(...this.getAdvancedSuggestions())
    }

    // Domain-specific suggestions
    if (context.businessDomain) {
      suggestions.push(...this.getDomainSpecificSuggestions(context.businessDomain))
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 10)
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private initializeKnowledgeBase(): HelpKnowledgeBase {
    return {
      toolHelp: new Map(),
      generalTopics: new Map(),
      tutorials: new Map(),
      faq: [],
      commonIssues: new Map(),
      beginnerGuides: [],
      advancedGuides: [],
      searchIndex: new HelpSearchIndex(),
    }
  }

  private async enhanceWithInteractiveElements(
    response: HelpResponse,
    query: HelpQuery,
    classification: QueryClassification
  ): Promise<void> {
    // Add follow-up questions
    response.followUpQuestions = this.generateFollowUpQuestions(query, classification)

    // Add suggested queries
    response.suggestedQueries = this.generateSuggestedQueries(query, classification)

    // Add quick actions
    response.quickActions = this.generateQuickActions(query, classification)
  }

  private generateErrorResponse(query: HelpQuery, error: Error): HelpResponse {
    return {
      answer:
        'I encountered an issue processing your help request. Please try rephrasing your question or contact support if the problem persists.',
      type: 'explanation',
      confidence: 0,
      followUpQuestions: [
        'Could you rephrase your question?',
        'Are you looking for help with a specific tool?',
        'Would you like to see general getting started information?',
      ],
    }
  }

  private extractRecentTools(history: ConversationMessage[]): string[] {
    const tools = new Set<string>()

    history.slice(-10).forEach((message) => {
      if (message.tools) {
        message.tools.forEach((tool) => tools.add(tool))
      }
    })

    return Array.from(tools)
  }

  private getBeginnerSuggestions(): RelatedHelpItem[] {
    return [
      {
        title: 'Getting Started Guide',
        description: 'Learn the basics of using tools effectively',
        query: 'how to get started',
        relevance: 0.9,
      },
      {
        title: 'Common Tool Patterns',
        description: 'Understand common usage patterns across tools',
        query: 'common tool usage patterns',
        relevance: 0.8,
      },
    ]
  }

  private getAdvancedSuggestions(): RelatedHelpItem[] {
    return [
      {
        title: 'Advanced Integrations',
        description: 'Learn about complex tool combinations',
        query: 'advanced tool integrations',
        relevance: 0.9,
      },
      {
        title: 'Performance Optimization',
        description: 'Optimize your tool usage for better performance',
        query: 'tool performance optimization',
        relevance: 0.8,
      },
    ]
  }

  private getDomainSpecificSuggestions(domain: string): RelatedHelpItem[] {
    const domainSuggestions: Record<string, RelatedHelpItem[]> = {
      software_development: [
        {
          title: 'Development Workflow Tools',
          description: 'Tools for software development workflows',
          query: 'development workflow tools',
          relevance: 0.9,
        },
      ],
      marketing: [
        {
          title: 'Marketing Automation Tools',
          description: 'Automate your marketing processes',
          query: 'marketing automation',
          relevance: 0.9,
        },
      ],
    }

    return domainSuggestions[domain] || []
  }

  private generateFollowUpQuestions(
    query: HelpQuery,
    classification: QueryClassification
  ): string[] {
    const questions: string[] = []

    switch (classification.type) {
      case 'how-to':
        questions.push(
          'Would you like to see a step-by-step tutorial?',
          'Are you looking for examples of this being used?'
        )
        break

      case 'troubleshoot':
        questions.push(
          'What error message are you seeing?',
          'When did this problem first occur?',
          'What steps have you already tried?'
        )
        break

      case 'compare':
        questions.push(
          'What factors are most important to you?',
          "What's your experience level with these tools?",
          'Are you looking for alternatives to your current approach?'
        )
        break
    }

    return questions
  }

  private generateSuggestedQueries(
    query: HelpQuery,
    classification: QueryClassification
  ): string[] {
    const suggestions: string[] = []

    if (query.specificTool) {
      suggestions.push(
        `How to troubleshoot ${query.specificTool}`,
        `Best practices for ${query.specificTool}`,
        `Alternatives to ${query.specificTool}`
      )
    }

    return suggestions
  }

  private generateQuickActions(
    query: HelpQuery,
    classification: QueryClassification
  ): QuickAction[] {
    const actions: QuickAction[] = []

    actions.push({
      label: 'Search Documentation',
      action: 'search',
      target: 'documentation',
      description: 'Search comprehensive documentation',
    })

    if (query.specificTool) {
      actions.push({
        label: `Try ${query.specificTool}`,
        action: 'tool',
        target: query.specificTool,
        description: 'Open tool with guided setup',
      })
    }

    if (classification.type === 'how-to') {
      actions.push({
        label: 'View Tutorial',
        action: 'tutorial',
        target: 'tutorial_search',
        description: 'Find step-by-step guides',
      })
    }

    return actions
  }

  private async findGeneralTroubleshooting(problem: string): Promise<TroubleshootingGuide | null> {
    // Search through common issues
    for (const [key, guide] of this.knowledgeBase.commonIssues.entries()) {
      if (problem.toLowerCase().includes(key.toLowerCase())) {
        return guide
      }
    }
    return null
  }
}

// =============================================================================
// Supporting Classes
// =============================================================================

interface QueryClassification {
  type: 'how-to' | 'what-is' | 'when-to-use' | 'troubleshoot' | 'compare' | 'general'
  confidence: number
  intent: UserIntent
  entities: string[]
  tools: string[]
}

class HelpQueryClassifier {
  private intentPatterns: Map<string, RegExp[]> = new Map()

  constructor() {
    this.loadPatterns()
  }

  async classifyQuery(query: HelpQuery): Promise<QueryClassification> {
    const message = query.userMessage.toLowerCase()

    // Classify query type
    const type = this.classifyQueryType(message)

    // Extract entities and tools
    const entities = this.extractEntities(message)
    const tools = this.extractMentionedTools(message)

    // Calculate confidence
    const confidence = this.calculateConfidence(message, type)

    return {
      type,
      confidence,
      intent: {
        primary: type,
        confidence,
        urgency: this.assessUrgency(message),
        complexity: this.assessComplexity(message),
      },
      entities,
      tools,
    }
  }

  private loadPatterns(): void {
    this.intentPatterns.set('how-to', [
      /how (?:do i|can i|to)/i,
      /(?:steps|instructions) (?:to|for)/i,
      /(?:guide|tutorial) (?:for|on)/i,
      /teach me/i,
    ])

    this.intentPatterns.set('what-is', [
      /what is/i,
      /what does .+ do/i,
      /(?:explain|define)/i,
      /what's the difference/i,
    ])

    this.intentPatterns.set('troubleshoot', [
      /(?:error|problem|issue|trouble|fix)/i,
      /not working/i,
      /(?:failed|broken)/i,
      /help.+(?:error|problem)/i,
    ])

    this.intentPatterns.set('compare', [
      /(?:compare|vs|versus|difference between)/i,
      /which (?:is better|should i use)/i,
      /(?:pros and cons|advantages)/i,
    ])

    this.intentPatterns.set('when-to-use', [
      /when (?:should|to|do) i use/i,
      /best (?:time|situation) (?:to|for)/i,
      /appropriate for/i,
    ])
  }

  private classifyQueryType(message: string): QueryClassification['type'] {
    let maxScore = 0
    let bestType: QueryClassification['type'] = 'general'

    this.intentPatterns.forEach((patterns, type) => {
      const score = patterns.reduce((acc, pattern) => {
        return acc + (pattern.test(message) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestType = type as QueryClassification['type']
      }
    })

    return bestType
  }

  private extractEntities(message: string): string[] {
    // Simple entity extraction
    const entities: string[] = []

    // Extract quoted strings
    const quotedEntities = message.match(/"([^"]+)"/g)
    if (quotedEntities) {
      entities.push(...quotedEntities.map((q) => q.replace(/"/g, '')))
    }

    return entities
  }

  private extractMentionedTools(message: string): string[] {
    const tools: string[] = []
    const message_lower = message.toLowerCase()

    // Common tool identifiers
    const toolPatterns = [
      /gmail/i,
      /email/i,
      /notion/i,
      /slack/i,
      /calendar/i,
      /database/i,
      /sql/i,
      /search/i,
      /github/i,
    ]

    toolPatterns.forEach((pattern) => {
      if (pattern.test(message_lower)) {
        const match = message_lower.match(pattern)
        if (match) {
          tools.push(match[0])
        }
      }
    })

    return tools
  }

  private calculateConfidence(message: string, type: string): number {
    const patterns = this.intentPatterns.get(type) || []
    const matches = patterns.filter((pattern) => pattern.test(message)).length
    return Math.min((matches / patterns.length) * 0.8 + 0.2, 1)
  }

  private assessUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentWords = /\b(?:urgent|asap|immediately|critical|emergency|help|broken)\b/i
    return urgentWords.test(message) ? 'high' : 'medium'
  }

  private assessComplexity(message: string): 'simple' | 'moderate' | 'complex' {
    const complexWords = /\b(?:integrate|complex|advanced|multiple|combine|optimize)\b/i
    return complexWords.test(message) ? 'complex' : 'simple'
  }
}

class HelpResponseGenerator {
  constructor(_knowledgeBase: HelpKnowledgeBase) {}

  async generateResponse(
    query: HelpQuery,
    classification: QueryClassification,
    searchResults: HelpSearchResult[]
  ): Promise<HelpResponse> {
    switch (classification.type) {
      case 'how-to':
        return this.generateHowToResponse(query, searchResults)

      case 'what-is':
        return this.generateExplanationResponse(query, searchResults)

      case 'troubleshoot':
        return this.generateTroubleshootingResponse(null, query.userMessage)

      case 'compare':
        return this.generateComparisonResponse([], query.userMessage)

      default:
        return this.generateGeneralResponse(query, searchResults)
    }
  }

  generateToolSpecificResponse(
    toolHelp: ToolHelp,
    context?: UsageContext,
    question?: string
  ): HelpResponse {
    let answer = `**${toolHelp.toolId}**\n\n${toolHelp.overview}\n\n`
    answer += `**Purpose:** ${toolHelp.purpose}\n\n`
    answer += `**When to use:**\n${toolHelp.whenToUse.map((item) => `• ${item}`).join('\n')}\n\n`

    if (toolHelp.parameters.length > 0) {
      answer += `**Parameters:**\n`
      toolHelp.parameters.forEach((param) => {
        answer += `• **${param.name}** (${param.type}): ${param.description}\n`
      })
      answer += '\n'
    }

    if (toolHelp.bestPractices.length > 0) {
      answer += `**Best Practices:**\n${toolHelp.bestPractices.map((practice) => `• ${practice}`).join('\n')}\n\n`
    }

    return {
      answer,
      type: 'explanation',
      confidence: 0.9,
      examples: toolHelp.examples,
      relatedHelp: this.generateRelatedHelp(toolHelp),
    }
  }

  generateTroubleshootingResponse(
    guide: TroubleshootingGuide | null,
    problem: string,
    context?: UsageContext
  ): HelpResponse {
    if (!guide) {
      return {
        answer:
          "I need more information to help troubleshoot this issue. Could you provide more details about what's happening?",
        type: 'troubleshooting',
        confidence: 0.3,
        followUpQuestions: [
          'What specific error are you seeing?',
          'What tool are you trying to use?',
          'What were you trying to accomplish?',
        ],
      }
    }

    let answer = '**Troubleshooting Guide**\n\n'

    // Find matching problems
    const matchingProblems = guide.commonProblems.filter(
      (p) =>
        p.symptom.toLowerCase().includes(problem.toLowerCase()) ||
        problem.toLowerCase().includes(p.symptom.toLowerCase())
    )

    if (matchingProblems.length > 0) {
      const problem_info = matchingProblems[0]
      answer += `**Problem:** ${problem_info.symptom}\n\n`
      answer += `**Possible Causes:**\n${problem_info.possibleCauses.map((cause) => `• ${cause}`).join('\n')}\n\n`
      answer += `**Solutions:**\n`

      problem_info.solutions.forEach((solution, index) => {
        answer += `${index + 1}. **${solution.description}**\n`
        solution.steps.forEach((step, stepIndex) => {
          answer += `   ${stepIndex + 1}. ${step}\n`
        })
        answer += '\n'
      })
    } else {
      answer += `**General troubleshooting tips:**\n`
      answer += guide.generalTips.map((tip) => `• ${tip}`).join('\n')
    }

    return {
      answer,
      type: 'troubleshooting',
      confidence: matchingProblems.length > 0 ? 0.8 : 0.5,
    }
  }

  generateComparisonResponse(
    tools: ToolHelp[],
    criteria?: string,
    context?: UsageContext
  ): HelpResponse {
    if (tools.length < 2) {
      return {
        answer:
          "I need at least two tools to compare. Please specify which tools you'd like me to compare.",
        type: 'comparison',
        confidence: 0.2,
      }
    }

    let answer = '**Tool Comparison**\n\n'

    tools.forEach((tool) => {
      answer += `**${tool.toolId}**\n`
      answer += `• Purpose: ${tool.purpose}\n`
      answer += `• Best for: ${tool.whenToUse.join(', ')}\n`
      answer += `• Common use cases: ${tool.commonUseCases.map((uc) => uc.title).join(', ')}\n\n`
    })

    answer += '**Summary:**\n'
    answer += 'Choose based on your specific needs and the context of your task.'

    return {
      answer,
      type: 'comparison',
      confidence: 0.7,
    }
  }

  private generateHowToResponse(query: HelpQuery, searchResults: HelpSearchResult[]): HelpResponse {
    return {
      answer: "Here's how to accomplish what you're looking for...",
      type: 'tutorial',
      confidence: 0.7,
    }
  }

  private generateExplanationResponse(
    query: HelpQuery,
    searchResults: HelpSearchResult[]
  ): HelpResponse {
    return {
      answer: 'Let me explain this concept...',
      type: 'explanation',
      confidence: 0.7,
    }
  }

  private generateGeneralResponse(
    query: HelpQuery,
    searchResults: HelpSearchResult[]
  ): HelpResponse {
    return {
      answer: "Based on your question, here's what I found...",
      type: 'explanation',
      confidence: 0.6,
    }
  }

  private generateRelatedHelp(toolHelp: ToolHelp): RelatedHelpItem[] {
    return toolHelp.alternatives.map((altTool) => ({
      title: `Learn about ${altTool}`,
      description: `Alternative tool with similar functionality`,
      query: `what is ${altTool}`,
      relevance: 0.6,
    }))
  }
}

class HelpSearchEngine {
  constructor(private knowledgeBase: HelpKnowledgeBase) {}

  async search(query: HelpQuery, classification: QueryClassification): Promise<HelpSearchResult[]> {
    const results: HelpSearchResult[] = []

    // Search tool help
    for (const [toolId, toolHelp] of this.knowledgeBase.toolHelp.entries()) {
      const relevance = this.calculateRelevance(query.userMessage, toolHelp)
      if (relevance > 0.3) {
        results.push({
          type: 'tool_help',
          content: toolHelp,
          relevance,
          source: toolId,
        })
      }
    }

    // Search FAQ
    this.knowledgeBase.faq.forEach((faqItem) => {
      const relevance = this.calculateFAQRelevance(query.userMessage, faqItem)
      if (relevance > 0.3) {
        results.push({
          type: 'faq',
          content: faqItem,
          relevance,
          source: 'faq',
        })
      }
    })

    return results.sort((a, b) => b.relevance - a.relevance)
  }

  private calculateRelevance(query: string, toolHelp: ToolHelp): number {
    const queryLower = query.toLowerCase()
    let relevance = 0

    // Check tool ID
    if (queryLower.includes(toolHelp.toolId.toLowerCase())) {
      relevance += 0.8
    }

    // Check overview and purpose
    if (toolHelp.overview.toLowerCase().includes(queryLower)) {
      relevance += 0.6
    }

    if (toolHelp.purpose.toLowerCase().includes(queryLower)) {
      relevance += 0.5
    }

    return Math.min(relevance, 1)
  }

  private calculateFAQRelevance(query: string, faqItem: FAQItem): number {
    const queryLower = query.toLowerCase()
    let relevance = 0

    // Check question similarity
    if (faqItem.question.toLowerCase().includes(queryLower)) {
      relevance += 0.7
    }

    // Check keywords
    const matchingKeywords = faqItem.keywords.filter((keyword) =>
      queryLower.includes(keyword.toLowerCase())
    )
    relevance += (matchingKeywords.length / faqItem.keywords.length) * 0.5

    return Math.min(relevance, 1)
  }
}

interface HelpSearchResult {
  type: 'tool_help' | 'general_topic' | 'tutorial' | 'faq' | 'troubleshooting'
  content: any
  relevance: number
  source: string
}

class HelpSearchIndex {
  // Implementation for search indexing would go here
  index(content: string, id: string): void {}
  search(query: string): Array<{ id: string; score: number }> {
    return []
  }
}

class TutorialManager {
  constructor(private knowledgeBase: HelpKnowledgeBase) {}

  async findBestTutorial(
    taskDescription: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced',
    context?: UsageContext
  ): Promise<Tutorial | null> {
    const tutorials = Array.from(this.knowledgeBase.tutorials.values())

    // Filter by difficulty level
    const levelAppropriate = tutorials.filter((tutorial) => tutorial.difficulty === userLevel)

    if (levelAppropriate.length === 0) {
      return null
    }

    // Score tutorials by relevance to task description
    const scored = levelAppropriate.map((tutorial) => ({
      tutorial,
      score: this.scoreTutorialRelevance(tutorial, taskDescription, context),
    }))

    // Return the highest scoring tutorial
    const best = scored.reduce((prev, current) => (current.score > prev.score ? current : prev))

    return best.score > 0.3 ? best.tutorial : null
  }

  private scoreTutorialRelevance(
    tutorial: Tutorial,
    taskDescription: string,
    context?: UsageContext
  ): number {
    let score = 0
    const taskLower = taskDescription.toLowerCase()

    // Check title relevance
    if (tutorial.title.toLowerCase().includes(taskLower)) {
      score += 0.5
    }

    // Check description relevance
    if (tutorial.description.toLowerCase().includes(taskLower)) {
      score += 0.3
    }

    // Check tool relevance
    if (context?.currentIntent) {
      const intentRelevantTools = this.getToolsForIntent(context.currentIntent.primary)
      const overlap = tutorial.tools.filter((tool) => intentRelevantTools.includes(tool)).length
      score += (overlap / Math.max(tutorial.tools.length, 1)) * 0.2
    }

    return Math.min(score, 1)
  }

  private getToolsForIntent(intent: string): string[] {
    const intentToolMap: Record<string, string[]> = {
      send_communication: ['gmail_send', 'slack_message', 'mail_send'],
      create_content: ['notion_create', 'google_docs_create'],
      search_information: ['google_search', 'exa_search'],
      manage_data: ['mysql_query', 'postgresql_query'],
    }

    return intentToolMap[intent] || []
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createHelpSystem(): NaturalLanguageHelpSystem {
  return new NaturalLanguageHelpSystem()
}

export async function processHelpQuery(
  query: string,
  context?: UsageContext
): Promise<HelpResponse> {
  const helpSystem = createHelpSystem()
  return helpSystem.processHelpQuery({ userMessage: query, context })
}
