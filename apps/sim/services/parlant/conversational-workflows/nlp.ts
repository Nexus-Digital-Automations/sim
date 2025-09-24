/**
 * Natural Language Processor for Conversational Workflows
 * ======================================================
 *
 * Processes natural language input from users and converts it into
 * structured workflow commands and parameters.
 */

import { createLogger } from '@/lib/logs/console/logger'
import type {
  ContextualReference,
  ConversationalWorkflowState,
  ConversationTurn,
  ExtractedEntity,
  NLPProcessingResult,
  WorkflowCommandType,
} from './types'

const logger = createLogger('ConversationalWorkflowNLP')

/**
 * Natural Language Processor for workflow commands
 */
export class NaturalLanguageProcessor {
  // Command pattern mappings
  private readonly commandPatterns: Map<WorkflowCommandType, RegExp[]> = new Map([
    [
      'start-workflow',
      [
        /^(start|begin|run|execute|launch)\s*(the\s*)?(workflow|process)/i,
        /^let'?s\s*(start|begin|get started)/i,
        /^(go|proceed)/i,
      ],
    ],
    [
      'pause-workflow',
      [
        /^(pause|stop|halt|suspend)\s*(the\s*)?(workflow|execution|process)/i,
        /^(wait|hold)\s*(on|up)/i,
      ],
    ],
    [
      'resume-workflow',
      [
        /^(resume|continue|restart)\s*(the\s*)?(workflow|execution|process)/i,
        /^(keep going|carry on)/i,
      ],
    ],
    [
      'cancel-workflow',
      [
        /^(cancel|abort|terminate|quit)\s*(the\s*)?(workflow|execution|process)/i,
        /^(stop everything|end it)/i,
      ],
    ],
    [
      'get-status',
      [
        /^(status|what'?s\s*happening|where are we|progress)/i,
        /^(how\s*(is|are)\s*we\s*doing|what'?s\s*the\s*progress)/i,
        /^(show\s*me\s*the\s*status)/i,
      ],
    ],
    [
      'explain-step',
      [
        /^(explain|what\s*is|describe|tell\s*me\s*about)\s*(this\s*step|current\s*step|what\s*we'?re\s*doing)/i,
        /^(what\s*are\s*we\s*doing|what\s*happens\s*here)/i,
      ],
    ],
    [
      'show-progress',
      [
        /^(show|display|what'?s)\s*(the\s*)?(progress|status|completion)/i,
        /^(how\s*much\s*is\s*done|how\s*far\s*along)/i,
      ],
    ],
    [
      'retry-step',
      [
        /^(retry|try\s*again|redo)\s*(this\s*step|current\s*step)?/i,
        /^(run\s*it\s*again|do\s*over)/i,
      ],
    ],
    [
      'skip-step',
      [
        /^(skip|bypass|jump\s*over|move\s*past)\s*(this\s*step|current\s*step)?/i,
        /^(next\s*step|move\s*on)/i,
      ],
    ],
    [
      'modify-input',
      [
        /^(change|modify|update|edit|set)\s*(the\s*)?(input|parameter|value)/i,
        /^(I\s*want\s*to\s*change|let\s*me\s*update)/i,
      ],
    ],
    [
      'list-options',
      [
        /^(what\s*can\s*I|what\s*are\s*my|show\s*me)\s*(options|choices|commands)/i,
        /^(help|what\s*can\s*you\s*do|available\s*actions)/i,
      ],
    ],
  ])

  // Entity extraction patterns
  private readonly entityPatterns = [
    {
      type: 'workflow_name',
      pattern: /workflow\s*["']?([^"'\s]+)["']?/i,
      extractor: (match: RegExpMatchArray) => match[1],
    },
    {
      type: 'step_name',
      pattern: /step\s*["']?([^"'\s]+)["']?/i,
      extractor: (match: RegExpMatchArray) => match[1],
    },
    {
      type: 'parameter_name',
      pattern: /(parameter|input|variable)\s*["']?([^"'\s]+)["']?/i,
      extractor: (match: RegExpMatchArray) => match[2],
    },
    {
      type: 'value',
      pattern: /(to|=|equals?)\s*["']?([^"'\s]+)["']?/i,
      extractor: (match: RegExpMatchArray) => match[2],
    },
    {
      type: 'number',
      pattern: /(\d+(?:\.\d+)?)/g,
      extractor: (match: RegExpMatchArray) => Number.parseFloat(match[1]),
    },
    {
      type: 'boolean',
      pattern: /\b(true|false|yes|no|on|off)\b/gi,
      extractor: (match: RegExpMatchArray) => {
        const value = match[1].toLowerCase()
        return ['true', 'yes', 'on'].includes(value)
      },
    },
  ]

  // Intent confidence thresholds
  private readonly confidenceThresholds = {
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  }

  // Conversation history for context
  private readonly conversationHistories = new Map<string, ConversationTurn[]>()

  constructor() {
    logger.info('Natural Language Processor initialized')
  }

  /**
   * Process natural language input and extract workflow commands
   */
  async processInput(
    input: string,
    currentState: ConversationalWorkflowState
  ): Promise<NLPProcessingResult> {
    const processedAt = new Date()
    const sessionId = currentState.sessionId

    logger.info('Processing natural language input', {
      sessionId,
      inputLength: input.length,
      currentStatus: currentState.executionStatus,
    })

    try {
      // Clean and normalize input
      const normalizedInput = this.normalizeInput(input)

      // Detect intent and confidence
      const intentResult = this.detectIntent(normalizedInput, currentState)

      // Extract entities
      const entities = this.extractEntities(normalizedInput)

      // Map to workflow command
      const commandMapping = this.mapToWorkflowCommand(intentResult, entities, currentState)

      // Identify contextual references
      const contextualReferences = this.identifyContextualReferences(normalizedInput, currentState)

      // Get conversation history
      const conversationHistory = this.conversationHistories.get(sessionId) || []

      // Add current turn to history
      const currentTurn: ConversationTurn = {
        turnId: this.generateTurnId(),
        timestamp: processedAt,
        speaker: 'user',
        content: input,
        intent: intentResult.primaryIntent,
        extractedEntities: entities,
        workflowAction: commandMapping.command,
      }

      this.updateConversationHistory(sessionId, currentTurn)

      const result: NLPProcessingResult = {
        originalInput: input,
        processedAt,
        detectedIntent: intentResult.primaryIntent,
        intentConfidence: intentResult.primaryConfidence,
        alternativeIntents: intentResult.alternatives,
        extractedEntities: entities,
        mappedCommand: commandMapping.command,
        commandParameters: commandMapping.parameters,
        contextualReferences,
        conversationHistory: [...conversationHistory, currentTurn],
      }

      logger.info('NLP processing completed', {
        sessionId,
        detectedIntent: result.detectedIntent,
        confidence: result.intentConfidence,
        mappedCommand: result.mappedCommand,
        entitiesCount: entities.length,
      })

      return result
    } catch (error: any) {
      logger.error('NLP processing failed', {
        sessionId,
        error: error.message,
        input: input.substring(0, 100),
      })

      // Return fallback result
      return {
        originalInput: input,
        processedAt,
        detectedIntent: 'unknown',
        intentConfidence: 0,
        alternativeIntents: [],
        extractedEntities: [],
        mappedCommand: 'get-status',
        commandParameters: {},
        contextualReferences: [],
        conversationHistory: this.conversationHistories.get(sessionId) || [],
      }
    }
  }

  /**
   * Normalize input text for better processing
   */
  private normalizeInput(input: string): string {
    return (
      input
        .trim()
        .toLowerCase()
        // Normalize contractions
        .replace(/won't/g, 'will not')
        .replace(/can't/g, 'cannot')
        .replace(/n't/g, ' not')
        .replace(/'re/g, ' are')
        .replace(/'ve/g, ' have')
        .replace(/'ll/g, ' will')
        .replace(/'d/g, ' would')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    )
  }

  /**
   * Detect intent from normalized input
   */
  private detectIntent(
    input: string,
    currentState: ConversationalWorkflowState
  ): {
    primaryIntent: string
    primaryConfidence: number
    alternatives: { intent: string; confidence: number }[]
  } {
    const matches: Array<{ intent: WorkflowCommandType; confidence: number }> = []

    // Check each command pattern
    for (const [commandType, patterns] of this.commandPatterns.entries()) {
      let bestConfidence = 0

      for (const pattern of patterns) {
        const match = input.match(pattern)
        if (match) {
          // Calculate confidence based on match quality
          const matchLength = match[0].length
          const inputLength = input.length
          const coverage = matchLength / inputLength
          const confidence = Math.min(0.95, 0.5 + coverage * 0.5)

          bestConfidence = Math.max(bestConfidence, confidence)
        }
      }

      if (bestConfidence > 0) {
        matches.push({ intent: commandType, confidence: bestConfidence })
      }
    }

    // Apply contextual adjustments
    const contextAdjustedMatches = this.applyContextualAdjustments(matches, currentState)

    // Sort by confidence
    contextAdjustedMatches.sort((a, b) => b.confidence - a.confidence)

    const primary = contextAdjustedMatches[0]
    const alternatives = contextAdjustedMatches
      .slice(1, 4)
      .map((match) => ({ intent: match.intent, confidence: match.confidence }))

    return {
      primaryIntent: primary?.intent || 'get-status',
      primaryConfidence: primary?.confidence || 0,
      alternatives,
    }
  }

  /**
   * Apply contextual adjustments to intent confidence
   */
  private applyContextualAdjustments(
    matches: Array<{ intent: WorkflowCommandType; confidence: number }>,
    currentState: ConversationalWorkflowState
  ): Array<{ intent: WorkflowCommandType; confidence: number }> {
    return matches.map((match) => {
      let adjustedConfidence = match.confidence

      // Context-based adjustments
      switch (currentState.executionStatus) {
        case 'not-started':
          if (match.intent === 'start-workflow') {
            adjustedConfidence *= 1.2 // Boost start commands when not started
          }
          if (['pause-workflow', 'resume-workflow'].includes(match.intent)) {
            adjustedConfidence *= 0.5 // Reduce pause/resume when not running
          }
          break

        case 'running':
          if (['pause-workflow', 'get-status'].includes(match.intent)) {
            adjustedConfidence *= 1.1 // Boost pause and status when running
          }
          if (match.intent === 'start-workflow') {
            adjustedConfidence *= 0.3 // Reduce start when already running
          }
          break

        case 'paused':
          if (match.intent === 'resume-workflow') {
            adjustedConfidence *= 1.3 // Strongly boost resume when paused
          }
          if (match.intent === 'pause-workflow') {
            adjustedConfidence *= 0.2 // Reduce pause when already paused
          }
          break

        case 'waiting-for-input':
          if (match.intent === 'modify-input') {
            adjustedConfidence *= 1.2 // Boost input modification when waiting for input
          }
          break

        case 'failed':
          if (match.intent === 'retry-step') {
            adjustedConfidence *= 1.3 // Boost retry when failed
          }
          break
      }

      // Error state adjustments
      if (currentState.errorCount > 0) {
        if (['retry-step', 'skip-step', 'get-status'].includes(match.intent)) {
          adjustedConfidence *= 1.1
        }
      }

      return {
        intent: match.intent,
        confidence: Math.min(0.95, adjustedConfidence),
      }
    })
  }

  /**
   * Extract entities from input
   */
  private extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = []

    for (const pattern of this.entityPatterns) {
      const matches = pattern.pattern.global
        ? Array.from(input.matchAll(pattern.pattern))
        : [input.match(pattern.pattern)].filter(Boolean)

      for (const match of matches) {
        if (match && match.index !== undefined) {
          try {
            const extractedValue = pattern.extractor(match)
            const confidence = this.calculateEntityConfidence(match, input)

            entities.push({
              entityType: pattern.type,
              entityValue: match[0],
              confidence,
              startPosition: match.index,
              endPosition: match.index + match[0].length,
              canonicalValue: extractedValue,
            })
          } catch (error) {
            logger.warn('Entity extraction failed for pattern', {
              pattern: pattern.type,
              match: match[0],
              error: (error as Error).message,
            })
          }
        }
      }
    }

    // Remove overlapping entities (keep higher confidence ones)
    return this.resolveEntityOverlaps(entities)
  }

  /**
   * Calculate confidence for extracted entity
   */
  private calculateEntityConfidence(match: RegExpMatchArray, input: string): number {
    const matchLength = match[0].length
    const inputLength = input.length

    // Base confidence on match length and context
    let confidence = Math.min(0.9, 0.6 + (matchLength / inputLength) * 0.3)

    // Adjust based on position (entities at the beginning or end are often more important)
    const position = (match.index || 0) / inputLength
    if (position < 0.2 || position > 0.8) {
      confidence *= 1.1
    }

    return Math.min(0.95, confidence)
  }

  /**
   * Resolve overlapping entities
   */
  private resolveEntityOverlaps(entities: ExtractedEntity[]): ExtractedEntity[] {
    // Sort by start position
    entities.sort((a, b) => a.startPosition - b.startPosition)

    const resolved: ExtractedEntity[] = []
    let lastEndPosition = -1

    for (const entity of entities) {
      if (entity.startPosition >= lastEndPosition) {
        resolved.push(entity)
        lastEndPosition = entity.endPosition
      } else {
        // Overlap detected - keep the one with higher confidence
        const lastEntity = resolved[resolved.length - 1]
        if (entity.confidence > lastEntity.confidence) {
          resolved[resolved.length - 1] = entity
          lastEndPosition = entity.endPosition
        }
      }
    }

    return resolved
  }

  /**
   * Map intent and entities to workflow command
   */
  private mapToWorkflowCommand(
    intentResult: { primaryIntent: string; primaryConfidence: number },
    entities: ExtractedEntity[],
    currentState: ConversationalWorkflowState
  ): { command: WorkflowCommandType | null; parameters: Record<string, any> } {
    const { primaryIntent, primaryConfidence } = intentResult

    // Only map to command if confidence is above threshold
    if (primaryConfidence < this.confidenceThresholds.low) {
      return { command: null, parameters: {} }
    }

    const command = primaryIntent as WorkflowCommandType
    const parameters: Record<string, any> = {}

    // Extract parameters from entities
    for (const entity of entities) {
      switch (entity.entityType) {
        case 'workflow_name':
          parameters.workflowName = entity.canonicalValue
          break
        case 'step_name':
          parameters.stepName = entity.canonicalValue
          break
        case 'parameter_name':
          parameters.parameterName = entity.canonicalValue
          break
        case 'value':
          parameters.value = entity.canonicalValue
          break
        case 'number':
          parameters.numericValue = entity.canonicalValue
          break
        case 'boolean':
          parameters.booleanValue = entity.canonicalValue
          break
      }
    }

    // Add confidence-based parameters
    parameters.intentConfidence = primaryConfidence
    parameters.confirmationRequired = primaryConfidence < this.confidenceThresholds.high
    parameters.verboseOutput = primaryConfidence < this.confidenceThresholds.medium

    return { command, parameters }
  }

  /**
   * Identify contextual references in input
   */
  private identifyContextualReferences(
    input: string,
    currentState: ConversationalWorkflowState
  ): ContextualReference[] {
    const references: ContextualReference[] = []

    // Reference patterns
    const referencePatterns = [
      {
        type: 'workflow' as const,
        pattern: /(this|current|the)\s*(workflow|process)/i,
        getId: () => currentState.workflowId,
      },
      {
        type: 'step' as const,
        pattern: /(this|current|the)\s*(step|stage|node)/i,
        getId: () => currentState.currentNodeId,
      },
      {
        type: 'previous-action' as const,
        pattern: /(last|previous|that)\s*(action|command|step)/i,
        getId: () => 'previous-action',
      },
    ]

    for (const refPattern of referencePatterns) {
      const match = input.match(refPattern.pattern)
      if (match && match.index !== undefined) {
        const referenceId = refPattern.getId()
        if (referenceId) {
          references.push({
            referenceType: refPattern.type,
            referenceId,
            referenceText: match[0],
            confidence: 0.8,
          })
        }
      }
    }

    return references
  }

  /**
   * Update conversation history for session
   */
  private updateConversationHistory(sessionId: string, turn: ConversationTurn): void {
    const history = this.conversationHistories.get(sessionId) || []
    history.push(turn)

    // Keep only last 20 turns to manage memory
    const maxTurns = 20
    if (history.length > maxTurns) {
      history.splice(0, history.length - maxTurns)
    }

    this.conversationHistories.set(sessionId, history)
  }

  /**
   * Generate unique turn ID
   */
  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Clear conversation history for session
   */
  clearHistory(sessionId: string): void {
    this.conversationHistories.delete(sessionId)
    logger.info('Cleared conversation history', { sessionId })
  }

  /**
   * Get conversation history for session
   */
  getHistory(sessionId: string): ConversationTurn[] {
    return this.conversationHistories.get(sessionId) || []
  }

  /**
   * Update processing capabilities with new patterns (for learning)
   */
  addCommandPattern(commandType: WorkflowCommandType, pattern: RegExp): void {
    const patterns = this.commandPatterns.get(commandType) || []
    patterns.push(pattern)
    this.commandPatterns.set(commandType, patterns)

    logger.info('Added new command pattern', {
      commandType,
      patternCount: patterns.length,
    })
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalPatterns: number
    commandTypes: number
    entityTypes: number
    activeSessions: number
  } {
    let totalPatterns = 0
    for (const patterns of this.commandPatterns.values()) {
      totalPatterns += patterns.length
    }

    return {
      totalPatterns,
      commandTypes: this.commandPatterns.size,
      entityTypes: this.entityPatterns.length,
      activeSessions: this.conversationHistories.size,
    }
  }
}
