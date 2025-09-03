/**
 * Contextual Help System - Smart assistance and guidance system
 * 
 * Provides intelligent, context-aware help throughout the application:
 * - Field-level help text and tooltips
 * - Smart suggestions based on user context and behavior
 * - Progressive disclosure of advanced features
 * - Best practice recommendations
 * - Error guidance and troubleshooting assistance
 * - Tutorial integration and learning pathways
 * 
 * @created 2025-09-03
 * @author Claude Development System
 */

import { createLogger } from '@/lib/logs/console/logger'
import { nanoid } from 'nanoid'

const logger = createLogger('ContextualHelp')

export interface HelpContent {
  id: string
  title: string
  content: string
  type: 'tip' | 'warning' | 'info' | 'success' | 'tutorial' | 'best-practice'
  context: HelpContext
  priority: 'low' | 'medium' | 'high' | 'critical'
  actions?: HelpAction[]
  relatedTopics?: string[]
  tutorialId?: string
  learnMoreUrl?: string
  dismissible: boolean
  analytics?: {
    shown: number
    clicked: number
    dismissed: number
  }
}

export interface HelpContext {
  component: string
  page: string
  userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  workflowState?: 'empty' | 'creating' | 'editing' | 'running' | 'debugging'
  blockType?: string
  errorState?: boolean
  lastAction?: string
  sessionTime?: number
  strugglesDetected?: string[]
}

export interface HelpAction {
  id: string
  label: string
  type: 'button' | 'link' | 'tutorial' | 'modal'
  action: string
  primary?: boolean
}

export interface Suggestion {
  id: string
  title: string
  description: string
  category: 'workflow' | 'optimization' | 'best-practice' | 'feature' | 'troubleshoot'
  confidence: number // 0-100
  triggers: string[]
  conditions: SuggestionCondition[]
  implementation?: {
    type: 'automatic' | 'guided' | 'manual'
    steps?: string[]
    code?: string
  }
  benefits: string[]
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
}

export interface SuggestionCondition {
  type: 'user_level' | 'workflow_state' | 'block_count' | 'execution_time' | 'error_rate' | 'custom'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches'
  value: any
  description: string
}

export interface StruggleAnalysis {
  id: string
  timestamp: Date
  struggles: DetectedStruggle[]
  recommendations: Suggestion[]
  confidence: number
  context: HelpContext
}

export interface DetectedStruggle {
  type: 'navigation' | 'configuration' | 'connection' | 'execution' | 'debugging' | 'concept'
  description: string
  indicators: string[]
  severity: 'minor' | 'moderate' | 'major'
  suggestedHelp: string[]
}

export interface UserInteraction {
  timestamp: Date
  type: 'click' | 'hover' | 'focus' | 'scroll' | 'key' | 'error'
  target: string
  context: Record<string, any>
  duration?: number
  successful?: boolean
}

/**
 * Contextual Help System Class
 * 
 * Manages intelligent help content delivery, user struggle detection,
 * and personalized assistance recommendations.
 */
export class ContextualHelpSystem {
  private helpContent = new Map<string, HelpContent[]>()
  private suggestions = new Map<string, Suggestion[]>()
  private userInteractions: UserInteraction[] = []
  private activeHelp = new Map<string, HelpContent>()
  private strugglesCache = new Map<string, StruggleAnalysis>()
  private helpQueue: HelpContent[] = []

  constructor() {
    logger.info('Initializing Contextual Help System')
    this.initializeHelpContent()
    this.initializeSuggestions()
    this.setupInteractionTracking()
  }

  /**
   * Get contextual help for a specific component and context
   */
  async getContextualHelp(component: string, userLevel: string, context?: Partial<HelpContext>): Promise<HelpContent[]> {
    const operationId = nanoid()
    const startTime = Date.now()
    
    logger.info(`[${operationId}] Getting contextual help`, {
      component,
      userLevel,
      context
    })

    try {
      const fullContext: HelpContext = {
        component,
        page: window.location.pathname,
        userLevel: userLevel as any,
        sessionTime: Date.now() - (context?.sessionTime || Date.now()),
        ...context
      }

      // Get base help content for component
      const componentHelp = this.helpContent.get(component) || []
      
      // Filter help based on context and user level
      const relevantHelp = componentHelp.filter(help => 
        this.isHelpRelevant(help, fullContext)
      )

      // Sort by priority and relevance
      const sortedHelp = relevantHelp.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      // Add dynamic suggestions
      const contextualSuggestions = await this.generateContextualSuggestions(fullContext)
      const suggestionHelp = contextualSuggestions.map(suggestion => 
        this.suggestionToHelpContent(suggestion, fullContext)
      )

      const allHelp = [...sortedHelp, ...suggestionHelp].slice(0, 5) // Limit to 5 items

      // Track help delivery
      allHelp.forEach(help => {
        if (!help.analytics) help.analytics = { shown: 0, clicked: 0, dismissed: 0 }
        help.analytics.shown++
        this.activeHelp.set(help.id, help)
      })

      const processingTime = Date.now() - startTime
      logger.info(`[${operationId}] Contextual help retrieved`, {
        component,
        helpItemsCount: allHelp.length,
        processingTimeMs: processingTime
      })

      return allHelp

    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error(`[${operationId}] Failed to get contextual help`, {
        component,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime
      })
      return []
    }
  }

  /**
   * Suggest next steps based on current workflow state
   */
  async suggestNextSteps(currentState: any): Promise<Suggestion[]> {
    const operationId = nanoid()
    
    logger.info(`[${operationId}] Generating next step suggestions`, {
      stateType: typeof currentState,
      stateKeys: Object.keys(currentState || {})
    })

    try {
      const suggestions: Suggestion[] = []

      // Analyze current workflow state
      const analysis = this.analyzeWorkflowState(currentState)

      // Get suggestions based on workflow completeness
      if (analysis.isEmpty) {
        suggestions.push(...this.getEmptyWorkflowSuggestions())
      } else if (analysis.hasBlocks && !analysis.hasConnections) {
        suggestions.push(...this.getUnconnectedBlocksSuggestions())
      } else if (analysis.isComplete && !analysis.hasTesting) {
        suggestions.push(...this.getTestingSuggestions())
      } else if (analysis.hasErrors) {
        suggestions.push(...this.getErrorResolutionSuggestions(analysis.errors))
      }

      // Add optimization suggestions for more complex workflows
      if (analysis.blockCount > 5) {
        suggestions.push(...this.getOptimizationSuggestions(currentState))
      }

      // Sort by confidence and impact
      const sortedSuggestions = suggestions.sort((a, b) => {
        const scoreA = a.confidence * (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1)
        const scoreB = b.confidence * (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1)
        return scoreB - scoreA
      })

      logger.info(`[${operationId}] Next step suggestions generated`, {
        suggestionsCount: sortedSuggestions.length,
        topSuggestion: sortedSuggestions[0]?.title
      })

      return sortedSuggestions.slice(0, 3) // Return top 3 suggestions

    } catch (error) {
      logger.error(`[${operationId}] Failed to generate next step suggestions`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Detect user struggles based on interaction patterns
   */
  async detectUserStruggles(interactions: UserInteraction[]): Promise<StruggleAnalysis> {
    const operationId = nanoid()
    
    logger.info(`[${operationId}] Analyzing user interactions for struggles`, {
      interactionsCount: interactions.length,
      timespan: interactions.length > 0 ? 
        interactions[interactions.length - 1].timestamp.getTime() - interactions[0].timestamp.getTime() : 0
    })

    try {
      const struggles: DetectedStruggle[] = []
      
      // Analyze interaction patterns
      const analysis = this.analyzeInteractionPatterns(interactions)
      
      // Detect navigation struggles
      if (analysis.averageTimePerAction > 30000) { // 30+ seconds per action
        struggles.push({
          type: 'navigation',
          description: 'User is taking a long time to navigate between interface elements',
          indicators: ['slow_navigation', 'hesitant_clicking'],
          severity: 'moderate',
          suggestedHelp: ['interface_tour', 'keyboard_shortcuts', 'quick_actions_guide']
        })
      }

      // Detect configuration struggles
      if (analysis.configurationAttempts > 3) {
        struggles.push({
          type: 'configuration',
          description: 'User is struggling with block configuration',
          indicators: ['multiple_config_attempts', 'frequent_form_resets'],
          severity: 'major',
          suggestedHelp: ['block_configuration_tutorial', 'common_patterns_guide']
        })
      }

      // Detect connection struggles
      if (analysis.connectionFailures > 2) {
        struggles.push({
          type: 'connection',
          description: 'User having difficulty connecting workflow blocks',
          indicators: ['failed_connections', 'drag_drop_issues'],
          severity: 'major',
          suggestedHelp: ['connection_tutorial', 'workflow_basics']
        })
      }

      // Detect execution/debugging struggles
      if (analysis.executionErrors > 1) {
        struggles.push({
          type: 'debugging',
          description: 'User encountering repeated execution errors',
          indicators: ['execution_failures', 'error_states'],
          severity: 'major',
          suggestedHelp: ['debugging_guide', 'common_errors', 'validation_tutorial']
        })
      }

      // Generate recommendations based on detected struggles
      const recommendations = await this.generateStruggleRecommendations(struggles)
      
      const confidence = this.calculateAnalysisConfidence(struggles, analysis)
      
      const struggleAnalysis: StruggleAnalysis = {
        id: operationId,
        timestamp: new Date(),
        struggles,
        recommendations,
        confidence,
        context: {
          component: 'general',
          page: window.location.pathname,
          userLevel: 'beginner', // Would be determined from user data
          sessionTime: analysis.totalSessionTime
        }
      }

      // Cache the analysis
      this.strugglesCache.set(operationId, struggleAnalysis)

      logger.info(`[${operationId}] User struggle analysis completed`, {
        strugglesCount: struggles.length,
        recommendationsCount: recommendations.length,
        confidence: Math.round(confidence)
      })

      return struggleAnalysis

    } catch (error) {
      logger.error(`[${operationId}] Failed to analyze user struggles`, {
        error: error instanceof Error ? error.message : String(error)
      })
      
      return {
        id: operationId,
        timestamp: new Date(),
        struggles: [],
        recommendations: [],
        confidence: 0,
        context: {
          component: 'general',
          page: window.location.pathname,
          userLevel: 'beginner'
        }
      }
    }
  }

  // Private helper methods

  private initializeHelpContent(): void {
    // Initialize help content for different components
    const helpDatabase = {
      'workflow-canvas': [
        {
          id: 'canvas-intro',
          title: 'Welcome to the Workflow Canvas',
          content: 'This is where you build your automation workflows by adding blocks and connecting them together. Drag blocks from the sidebar onto the canvas to get started.',
          type: 'info' as const,
          context: { component: 'workflow-canvas', page: '', userLevel: 'beginner' as const },
          priority: 'high' as const,
          dismissible: true,
          actions: [{
            id: 'start-tutorial',
            label: 'Start Tutorial',
            type: 'tutorial' as const,
            action: 'start_first_workflow_tutorial',
            primary: true
          }]
        },
        {
          id: 'canvas-empty-state',
          title: 'Add Your First Block',
          content: 'Every workflow starts with a trigger block. Try adding a Starter block from the sidebar to begin building your automation.',
          type: 'tip' as const,
          context: { component: 'workflow-canvas', page: '', userLevel: 'beginner' as const, workflowState: 'empty' },
          priority: 'high' as const,
          dismissible: true
        }
      ],

      'block-library': [
        {
          id: 'blocks-overview',
          title: 'Block Library',
          content: 'Blocks are the building blocks of your workflows. Each block performs a specific action like sending emails, calling APIs, or processing data.',
          type: 'info' as const,
          context: { component: 'block-library', page: '', userLevel: 'beginner' as const },
          priority: 'medium' as const,
          dismissible: true
        },
        {
          id: 'starter-block-help',
          title: 'Start with a Starter Block',
          content: 'Every workflow needs a trigger. The Starter block is perfect for manual triggers or testing workflows.',
          type: 'tip' as const,
          context: { component: 'block-library', page: '', userLevel: 'beginner' as const, workflowState: 'empty' },
          priority: 'high' as const,
          dismissible: true
        }
      ],

      'control-bar': [
        {
          id: 'run-workflow-help',
          title: 'Running Your Workflow',
          content: 'Click the Run button to execute your workflow and see the results. Make sure all blocks are connected properly first.',
          type: 'info' as const,
          context: { component: 'control-bar', page: '', userLevel: 'beginner' as const },
          priority: 'medium' as const,
          dismissible: true
        },
        {
          id: 'debug-mode-help',
          title: 'Debug Mode',
          content: 'Enable debug mode to see detailed execution information and catch errors more easily.',
          type: 'tip' as const,
          context: { component: 'control-bar', page: '', userLevel: 'intermediate' as const },
          priority: 'low' as const,
          dismissible: true
        }
      ],

      'block-configuration': [
        {
          id: 'config-required-fields',
          title: 'Required Fields',
          content: 'Fields marked with a red asterisk (*) are required and must be filled in before the workflow can run successfully.',
          type: 'warning' as const,
          context: { component: 'block-configuration', page: '', userLevel: 'beginner' as const },
          priority: 'high' as const,
          dismissible: false
        },
        {
          id: 'config-variables',
          title: 'Using Variables',
          content: 'You can reference data from previous blocks using {{variable}} syntax. This allows data to flow through your workflow.',
          type: 'best-practice' as const,
          context: { component: 'block-configuration', page: '', userLevel: 'intermediate' as const },
          priority: 'medium' as const,
          dismissible: true
        }
      ]
    }

    // Store help content in the system
    Object.entries(helpDatabase).forEach(([component, content]) => {
      this.helpContent.set(component, content as HelpContent[])
    })
  }

  private initializeSuggestions(): void {
    const suggestionDatabase = [
      {
        id: 'add-error-handling',
        title: 'Add Error Handling',
        description: 'Add condition blocks to handle potential errors and make your workflow more robust',
        category: 'best-practice' as const,
        confidence: 75,
        triggers: ['workflow_has_api_blocks', 'no_error_handling'],
        conditions: [{
          type: 'block_count' as const,
          operator: 'greater_than' as const,
          value: 2,
          description: 'Workflow has more than 2 blocks'
        }],
        benefits: ['Improved reliability', 'Better user experience', 'Easier debugging'],
        effort: 'medium' as const,
        impact: 'high' as const
      },
      {
        id: 'optimize-api-calls',
        title: 'Optimize API Calls',
        description: 'Consider batching API calls or adding caching to improve performance',
        category: 'optimization' as const,
        confidence: 80,
        triggers: ['multiple_api_blocks', 'slow_execution'],
        conditions: [{
          type: 'execution_time' as const,
          operator: 'greater_than' as const,
          value: 30000, // 30 seconds
          description: 'Workflow takes longer than 30 seconds'
        }],
        benefits: ['Faster execution', 'Reduced API costs', 'Better scalability'],
        effort: 'high' as const,
        impact: 'high' as const
      },
      {
        id: 'add-logging',
        title: 'Add Logging',
        description: 'Add response blocks to log important data for debugging and monitoring',
        category: 'best-practice' as const,
        confidence: 60,
        triggers: ['complex_workflow', 'debugging_needed'],
        conditions: [{
          type: 'block_count' as const,
          operator: 'greater_than' as const,
          value: 5,
          description: 'Complex workflow with many blocks'
        }],
        benefits: ['Easier debugging', 'Better monitoring', 'Audit trail'],
        effort: 'low' as const,
        impact: 'medium' as const
      }
    ]

    suggestionDatabase.forEach(suggestion => {
      const category = this.suggestions.get(suggestion.category) || []
      category.push(suggestion as Suggestion)
      this.suggestions.set(suggestion.category, category)
    })
  }

  private setupInteractionTracking(): void {
    // Track user interactions for struggle detection
    const trackInteraction = (type: UserInteraction['type'], target: string, context: any = {}) => {
      const interaction: UserInteraction = {
        timestamp: new Date(),
        type,
        target,
        context,
        successful: context.successful !== false
      }
      
      this.userInteractions.push(interaction)
      
      // Keep only last 50 interactions to prevent memory issues
      if (this.userInteractions.length > 50) {
        this.userInteractions.shift()
      }
    }

    // Set up event listeners (would be customized based on specific app needs)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      trackInteraction('click', target.tagName + (target.id ? `#${target.id}` : ''), {
        x: e.clientX,
        y: e.clientY
      })
    })

    document.addEventListener('error', (e) => {
      trackInteraction('error', 'window', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        successful: false
      })
    })
  }

  private isHelpRelevant(help: HelpContent, context: HelpContext): boolean {
    // Check if help matches current context
    if (help.context.component !== context.component) return false
    
    // Check user level appropriateness
    const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert']
    const userLevelIndex = levelOrder.indexOf(context.userLevel)
    const helpLevelIndex = levelOrder.indexOf(help.context.userLevel)
    
    if (helpLevelIndex > userLevelIndex) return false
    
    // Check workflow state relevance
    if (help.context.workflowState && context.workflowState !== help.context.workflowState) {
      return false
    }
    
    // Check if help has already been shown too many times
    if (help.analytics && help.analytics.shown > 3 && help.analytics.clicked === 0) {
      return false
    }

    return true
  }

  private async generateContextualSuggestions(context: HelpContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    // Get all suggestions and filter by context
    this.suggestions.forEach((categorySuggestions) => {
      categorySuggestions.forEach(suggestion => {
        if (this.isSuggestionRelevant(suggestion, context)) {
          suggestions.push(suggestion)
        }
      })
    })

    return suggestions
  }

  private isSuggestionRelevant(suggestion: Suggestion, context: HelpContext): boolean {
    // Check conditions
    return suggestion.conditions.every(condition => {
      return this.evaluateCondition(condition, context)
    })
  }

  private evaluateCondition(condition: SuggestionCondition, context: HelpContext): boolean {
    // Simplified condition evaluation
    switch (condition.type) {
      case 'user_level':
        const levels = ['beginner', 'intermediate', 'advanced', 'expert']
        const userIndex = levels.indexOf(context.userLevel)
        const conditionIndex = levels.indexOf(condition.value)
        
        switch (condition.operator) {
          case 'equals': return userIndex === conditionIndex
          case 'greater_than': return userIndex > conditionIndex
          case 'less_than': return userIndex < conditionIndex
          default: return false
        }
      
      default:
        return true // Simplified for demo
    }
  }

  private suggestionToHelpContent(suggestion: Suggestion, context: HelpContext): HelpContent {
    return {
      id: `suggestion-${suggestion.id}`,
      title: suggestion.title,
      content: suggestion.description,
      type: 'tip',
      context,
      priority: suggestion.confidence > 80 ? 'high' : suggestion.confidence > 60 ? 'medium' : 'low',
      dismissible: true,
      actions: [{
        id: 'implement-suggestion',
        label: 'Learn More',
        type: 'button',
        action: `implement_${suggestion.id}`
      }],
      relatedTopics: [suggestion.category]
    }
  }

  private analyzeWorkflowState(state: any) {
    // Analyze workflow state for completeness and issues
    return {
      isEmpty: !state?.blocks || Object.keys(state.blocks).length === 0,
      hasBlocks: state?.blocks && Object.keys(state.blocks).length > 0,
      hasConnections: state?.edges && state.edges.length > 0,
      blockCount: state?.blocks ? Object.keys(state.blocks).length : 0,
      isComplete: state?.blocks && state?.edges && 
                   Object.keys(state.blocks).length > 0 && state.edges.length > 0,
      hasTesting: state?.lastExecution !== undefined,
      hasErrors: state?.errors && state.errors.length > 0,
      errors: state?.errors || []
    }
  }

  private getEmptyWorkflowSuggestions(): Suggestion[] {
    return [{
      id: 'start-with-starter',
      title: 'Add a Starter Block',
      description: 'Begin your workflow with a Starter block to define when it should run',
      category: 'workflow',
      confidence: 95,
      triggers: ['empty_workflow'],
      conditions: [],
      implementation: {
        type: 'guided',
        steps: ['Open block library', 'Find Starter block', 'Drag to canvas']
      },
      benefits: ['Establishes workflow trigger', 'Provides clear starting point'],
      effort: 'low',
      impact: 'high'
    }]
  }

  private getUnconnectedBlocksSuggestions(): Suggestion[] {
    return [{
      id: 'connect-blocks',
      title: 'Connect Your Blocks',
      description: 'Connect blocks together to create a workflow that processes data from one step to the next',
      category: 'workflow',
      confidence: 90,
      triggers: ['unconnected_blocks'],
      conditions: [],
      implementation: {
        type: 'guided',
        steps: ['Select source block', 'Drag from output handle', 'Connect to target block input']
      },
      benefits: ['Creates data flow', 'Enables workflow execution'],
      effort: 'low',
      impact: 'high'
    }]
  }

  private getTestingSuggestions(): Suggestion[] {
    return [{
      id: 'test-workflow',
      title: 'Test Your Workflow',
      description: 'Run your workflow to ensure it works as expected before deploying',
      category: 'best-practice',
      confidence: 85,
      triggers: ['untested_workflow'],
      conditions: [],
      implementation: {
        type: 'automatic',
        steps: ['Click Run button', 'Review execution results', 'Fix any errors']
      },
      benefits: ['Validates workflow logic', 'Identifies issues early', 'Builds confidence'],
      effort: 'low',
      impact: 'high'
    }]
  }

  private getErrorResolutionSuggestions(errors: any[]): Suggestion[] {
    return [{
      id: 'fix-errors',
      title: 'Resolve Workflow Errors',
      description: 'Fix the errors in your workflow to ensure reliable execution',
      category: 'troubleshoot',
      confidence: 95,
      triggers: ['workflow_errors'],
      conditions: [],
      implementation: {
        type: 'guided',
        steps: ['Review error messages', 'Check block configurations', 'Test connections']
      },
      benefits: ['Reliable workflow execution', 'Better user experience'],
      effort: 'medium',
      impact: 'high'
    }]
  }

  private getOptimizationSuggestions(state: any): Suggestion[] {
    return [{
      id: 'optimize-performance',
      title: 'Optimize Workflow Performance',
      description: 'Improve your workflow efficiency with performance optimizations',
      category: 'optimization',
      confidence: 70,
      triggers: ['complex_workflow'],
      conditions: [],
      benefits: ['Faster execution', 'Lower resource usage', 'Better scalability'],
      effort: 'high',
      impact: 'medium'
    }]
  }

  private analyzeInteractionPatterns(interactions: UserInteraction[]) {
    // Analyze user interaction patterns for struggle detection
    const totalTime = interactions.length > 0 ? 
      interactions[interactions.length - 1].timestamp.getTime() - interactions[0].timestamp.getTime() : 0
    
    return {
      totalSessionTime: totalTime,
      averageTimePerAction: interactions.length > 0 ? totalTime / interactions.length : 0,
      configurationAttempts: interactions.filter(i => 
        i.target.includes('config') || i.target.includes('form')).length,
      connectionFailures: interactions.filter(i => 
        i.type === 'error' && i.context?.message?.includes('connection')).length,
      executionErrors: interactions.filter(i => 
        i.type === 'error' && i.context?.message?.includes('execution')).length
    }
  }

  private async generateStruggleRecommendations(struggles: DetectedStruggle[]): Promise<Suggestion[]> {
    const recommendations: Suggestion[] = []
    
    struggles.forEach(struggle => {
      struggle.suggestedHelp.forEach(helpId => {
        recommendations.push({
          id: `help-${helpId}`,
          title: `Get Help with ${struggle.type}`,
          description: `Learn how to overcome ${struggle.type} challenges`,
          category: 'troubleshoot',
          confidence: 80,
          triggers: [struggle.type],
          conditions: [],
          benefits: ['Improved understanding', 'Faster progress', 'Less frustration'],
          effort: 'low',
          impact: 'high'
        })
      })
    })
    
    return recommendations
  }

  private calculateAnalysisConfidence(struggles: DetectedStruggle[], analysis: any): number {
    // Calculate confidence in struggle analysis based on data quality and patterns
    let confidence = 50 // Base confidence
    
    // Increase confidence based on data quantity
    if (analysis.totalSessionTime > 300000) { // 5+ minutes of data
      confidence += 20
    }
    
    // Increase confidence based on clear patterns
    if (struggles.some(s => s.severity === 'major')) {
      confidence += 15
    }
    
    // Decrease confidence if limited data
    if (analysis.totalSessionTime < 60000) { // Less than 1 minute
      confidence -= 20
    }
    
    return Math.max(0, Math.min(100, confidence))
  }

  // Public API methods

  public trackHelpInteraction(helpId: string, interaction: 'clicked' | 'dismissed'): void {
    const help = this.activeHelp.get(helpId)
    if (help?.analytics) {
      if (interaction === 'clicked') {
        help.analytics.clicked++
      } else {
        help.analytics.dismissed++
      }
    }
  }

  public getActiveHelp(): HelpContent[] {
    return Array.from(this.activeHelp.values())
  }

  public dismissHelp(helpId: string): void {
    this.activeHelp.delete(helpId)
    this.trackHelpInteraction(helpId, 'dismissed')
  }

  public addCustomHelp(component: string, help: HelpContent): void {
    const existing = this.helpContent.get(component) || []
    existing.push(help)
    this.helpContent.set(component, existing)
  }

  public getHelpStatistics(): Record<string, any> {
    const stats = {
      totalHelpItems: 0,
      totalShown: 0,
      totalClicked: 0,
      totalDismissed: 0,
      clickThroughRate: 0,
      dismissalRate: 0
    }

    this.helpContent.forEach(helps => {
      helps.forEach(help => {
        stats.totalHelpItems++
        if (help.analytics) {
          stats.totalShown += help.analytics.shown
          stats.totalClicked += help.analytics.clicked
          stats.totalDismissed += help.analytics.dismissed
        }
      })
    })

    stats.clickThroughRate = stats.totalShown > 0 ? 
      (stats.totalClicked / stats.totalShown) * 100 : 0
    stats.dismissalRate = stats.totalShown > 0 ? 
      (stats.totalDismissed / stats.totalShown) * 100 : 0

    return stats
  }
}

// Export singleton instance
export const contextualHelpSystem = new ContextualHelpSystem()

export default ContextualHelpSystem