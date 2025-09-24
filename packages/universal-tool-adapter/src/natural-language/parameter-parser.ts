/**
 * Conversational Parameter Collection with NLP Parsing
 *
 * Enables natural language parameter input and intelligent parsing for tool
 * execution, making tools accessible through conversational interfaces.
 *
 * @author NATURAL_LANGUAGE_ENGINE_AGENT
 * @version 1.0.0
 */

import type { ToolConfig } from '@/tools/types'
import type {
  ParameterMapping,
  ValidationConfig,
  ParameterContext,
  UsageContext
} from '../types/adapter-interfaces'

// =============================================================================
// Parameter Parsing Types
// =============================================================================

export interface ConversationalInput {
  rawMessage: string
  context?: UsageContext
  previousParameters?: Record<string, any>
  toolId: string
}

export interface ParsedParameters {
  parameters: Record<string, any>
  confidence: number
  missingRequired: string[]
  clarificationNeeded: ParameterClarification[]
  suggestions: ParameterSuggestion[]
}

export interface ParameterClarification {
  parameter: string
  type: 'missing' | 'ambiguous' | 'invalid' | 'confirmation'
  message: string
  suggestions?: string[]
  examples?: string[]
}

export interface ParameterSuggestion {
  parameter: string
  value: any
  confidence: number
  source: 'context' | 'history' | 'inference' | 'default'
  reasoning: string
}

export interface ExtractionPattern {
  parameter: string
  patterns: RegExp[]
  extractor: (match: RegExpMatchArray, fullText: string) => any
  validator?: (value: any) => boolean
  transformer?: (value: any) => any
}

export interface ParameterEntity {
  name: string
  type: 'email' | 'url' | 'date' | 'time' | 'number' | 'text' | 'json' | 'boolean' | 'file'
  value: any
  confidence: number
  position: [number, number] // [start, end] in original text
  source: string // original matched text
}

// =============================================================================
// Natural Language Parameter Parser
// =============================================================================

export class ConversationalParameterParser {
  private entityExtractors: Map<string, EntityExtractor>
  private patternMatchers: Map<string, ExtractionPattern[]>
  private contextualInference: ContextualInferenceEngine

  constructor() {
    this.entityExtractors = new Map()
    this.patternMatchers = new Map()
    this.contextualInference = new ContextualInferenceEngine()

    this.initializeEntityExtractors()
    this.loadCommonPatterns()
  }

  /**
   * Parse natural language input into structured parameters
   */
  async parseParameters(
    input: ConversationalInput,
    tool: ToolConfig
  ): Promise<ParsedParameters> {
    const { rawMessage, context, previousParameters, toolId } = input

    // Step 1: Extract entities from the message
    const entities = await this.extractEntities(rawMessage)

    // Step 2: Match patterns specific to this tool
    const patternMatches = this.matchToolPatterns(rawMessage, toolId, tool)

    // Step 3: Use contextual inference for missing parameters
    const inferredParameters = await this.contextualInference.infer(
      rawMessage,
      tool,
      context,
      previousParameters
    )

    // Step 4: Combine and validate all parameter sources
    const combinedParameters = this.combineParameterSources(
      entities,
      patternMatches,
      inferredParameters,
      previousParameters || {}
    )

    // Step 5: Validate against tool schema
    const validationResult = await this.validateParameters(combinedParameters, tool)

    // Step 6: Generate clarifications and suggestions
    const clarifications = this.generateClarifications(validationResult, tool, context)
    const suggestions = this.generateSuggestions(combinedParameters, tool, context)

    return {
      parameters: validationResult.validParameters,
      confidence: this.calculateOverallConfidence(entities, patternMatches, inferredParameters),
      missingRequired: validationResult.missingRequired,
      clarificationNeeded: clarifications,
      suggestions
    }
  }

  /**
   * Generate follow-up questions for missing parameters
   */
  generateFollowUpQuestions(
    missingParams: string[],
    tool: ToolConfig,
    context?: UsageContext
  ): ConversationPrompt[] {
    return missingParams.map(paramName => {
      const paramConfig = tool.params?.[paramName]
      return this.createParameterPrompt(paramName, paramConfig, context)
    })
  }

  /**
   * Suggest parameter values based on context
   */
  async suggestParameterValues(
    parameter: string,
    tool: ToolConfig,
    context?: UsageContext,
    previousValue?: any
  ): Promise<ParameterSuggestion[]> {
    const suggestions: ParameterSuggestion[] = []

    // Context-based suggestions
    if (context) {
      const contextSuggestion = await this.getContextualSuggestion(parameter, context)
      if (contextSuggestion) {
        suggestions.push(contextSuggestion)
      }
    }

    // History-based suggestions
    if (context?.messageHistory) {
      const historySuggestion = this.getHistoricalSuggestion(parameter, context.messageHistory)
      if (historySuggestion) {
        suggestions.push(historySuggestion)
      }
    }

    // Default value suggestions
    const paramConfig = tool.params?.[parameter]
    if (paramConfig && typeof paramConfig === 'object') {
      const defaultSuggestion = this.getDefaultSuggestion(parameter, paramConfig)
      if (defaultSuggestion) {
        suggestions.push(defaultSuggestion)
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  // =============================================================================
  // Entity Extraction Methods
  // =============================================================================

  private async extractEntities(text: string): Promise<ParameterEntity[]> {
    const entities: ParameterEntity[] = []

    // Run all entity extractors
    for (const [type, extractor] of this.entityExtractors.entries()) {
      const extractedEntities = await extractor.extract(text)
      entities.push(...extractedEntities.map(entity => ({
        ...entity,
        type: type as any
      })))
    }

    // Remove overlapping entities (keep highest confidence)
    return this.resolveEntityConflicts(entities)
  }

  private matchToolPatterns(
    text: string,
    toolId: string,
    tool: ToolConfig
  ): Record<string, any> {
    const patterns = this.patternMatchers.get(toolId) || []
    const matches: Record<string, any> = {}

    patterns.forEach(pattern => {
      for (const regex of pattern.patterns) {
        const match = text.match(regex)
        if (match) {
          try {
            const value = pattern.extractor(match, text)
            if (pattern.validator?.(value) ?? true) {
              matches[pattern.parameter] = pattern.transformer?.(value) ?? value
            }
          } catch (error) {
            console.warn(`Pattern extraction failed for ${pattern.parameter}:`, error)
          }
        }
      }
    })

    return matches
  }

  private combineParameterSources(
    entities: ParameterEntity[],
    patterns: Record<string, any>,
    inferred: Record<string, any>,
    previous: Record<string, any>
  ): Record<string, any> {
    const combined: Record<string, any> = { ...previous }

    // Add inferred parameters (lowest priority)
    Object.entries(inferred).forEach(([key, value]) => {
      if (!combined[key]) {
        combined[key] = value
      }
    })

    // Add pattern matches (medium priority)
    Object.entries(patterns).forEach(([key, value]) => {
      combined[key] = value
    })

    // Add entity extractions (highest priority)
    entities.forEach(entity => {
      const paramName = this.mapEntityToParameter(entity)
      if (paramName && entity.confidence > 0.7) {
        combined[paramName] = entity.value
      }
    })

    return combined
  }

  private async validateParameters(
    parameters: Record<string, any>,
    tool: ToolConfig
  ): Promise<{ validParameters: Record<string, any>, missingRequired: string[] }> {
    const validParameters: Record<string, any> = {}
    const missingRequired: string[] = []

    const toolParams = tool.params || {}

    // Check each tool parameter
    for (const [paramName, paramConfig] of Object.entries(toolParams)) {
      if (typeof paramConfig === 'object') {
        const value = parameters[paramName]

        if (paramConfig.required && (value === undefined || value === null)) {
          missingRequired.push(paramName)
        } else if (value !== undefined) {
          // Validate and transform the parameter
          const validatedValue = await this.validateParameterValue(value, paramConfig)
          if (validatedValue !== null) {
            validParameters[paramName] = validatedValue
          }
        }
      }
    }

    return { validParameters, missingRequired }
  }

  private generateClarifications(
    validationResult: { validParameters: Record<string, any>, missingRequired: string[] },
    tool: ToolConfig,
    context?: UsageContext
  ): ParameterClarification[] {
    const clarifications: ParameterClarification[] = []

    validationResult.missingRequired.forEach(paramName => {
      const paramConfig = tool.params?.[paramName]
      if (typeof paramConfig === 'object') {
        clarifications.push({
          parameter: paramName,
          type: 'missing',
          message: this.generateMissingParameterMessage(paramName, paramConfig, context),
          suggestions: this.generateParameterSuggestionTexts(paramName, paramConfig),
          examples: this.generateParameterExamples(paramName, paramConfig)
        })
      }
    })

    return clarifications
  }

  private generateSuggestions(
    parameters: Record<string, any>,
    tool: ToolConfig,
    context?: UsageContext
  ): ParameterSuggestion[] {
    const suggestions: ParameterSuggestion[] = []

    // Suggest improvements for existing parameters
    Object.entries(parameters).forEach(([paramName, value]) => {
      const improvement = this.suggestParameterImprovement(paramName, value, tool, context)
      if (improvement) {
        suggestions.push(improvement)
      }
    })

    // Suggest optional parameters that might be useful
    const toolParams = tool.params || {}
    Object.entries(toolParams).forEach(([paramName, paramConfig]) => {
      if (typeof paramConfig === 'object' && !paramConfig.required && !parameters[paramName]) {
        const suggestion = this.suggestOptionalParameter(paramName, paramConfig, context)
        if (suggestion) {
          suggestions.push(suggestion)
        }
      }
    })

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  // =============================================================================
  // Entity Extractor Implementations
  // =============================================================================

  private initializeEntityExtractors(): void {
    this.entityExtractors.set('email', new EmailExtractor())
    this.entityExtractors.set('url', new URLExtractor())
    this.entityExtractors.set('date', new DateExtractor())
    this.entityExtractors.set('time', new TimeExtractor())
    this.entityExtractors.set('number', new NumberExtractor())
    this.entityExtractors.set('boolean', new BooleanExtractor())
    this.entityExtractors.set('file', new FileExtractor())
  }

  private loadCommonPatterns(): void {
    // Load tool-specific extraction patterns
    this.loadEmailToolPatterns()
    this.loadCalendarToolPatterns()
    this.loadDatabaseToolPatterns()
    this.loadDocumentToolPatterns()
  }

  private loadEmailToolPatterns(): void {
    const emailPatterns: ExtractionPattern[] = [
      {
        parameter: 'to',
        patterns: [
          /send (?:an? )?email to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
          /email ([^@\s]+@[^@\s]+\.[a-zA-Z]{2,})/i,
          /message ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
        ],
        extractor: (match) => match[1],
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      },
      {
        parameter: 'subject',
        patterns: [
          /subject[:\s]+"([^"]+)"/i,
          /subject[:\s]+(.+?)(?:\s+(?:with|about|regarding)|\s*$)/i,
          /about "([^"]+)"/i
        ],
        extractor: (match) => match[1].trim(),
        validator: (value) => typeof value === 'string' && value.length > 0
      },
      {
        parameter: 'body',
        patterns: [
          /(?:saying|message|content)[:\s]+"([^"]+)"/i,
          /(?:tell them|saying)[:\s]+(.+?)(?:\s*$)/i
        ],
        extractor: (match) => match[1].trim(),
        validator: (value) => typeof value === 'string' && value.length > 0
      }
    ]

    this.patternMatchers.set('gmail_send', emailPatterns)
    this.patternMatchers.set('outlook_send', emailPatterns)
    this.patternMatchers.set('mail_send', emailPatterns)
  }

  private loadCalendarToolPatterns(): void {
    const calendarPatterns: ExtractionPattern[] = [
      {
        parameter: 'title',
        patterns: [
          /(?:schedule|create|book) (?:a )?(?:meeting|event|appointment) (?:called|titled|about) "([^"]+)"/i,
          /(?:meeting|event) "([^"]+)"/i
        ],
        extractor: (match) => match[1].trim()
      },
      {
        parameter: 'start_time',
        patterns: [
          /(?:at|for) (\d{1,2}:\d{2}(?:\s*[ap]m)?)/i,
          /(?:starting|beginning) (\d{1,2}:\d{2}(?:\s*[ap]m)?)/i
        ],
        extractor: (match) => this.parseTime(match[1])
      }
    ]

    this.patternMatchers.set('google_calendar_create', calendarPatterns)
    this.patternMatchers.set('outlook_calendar_create', calendarPatterns)
  }

  private loadDatabaseToolPatterns(): void {
    const dbPatterns: ExtractionPattern[] = [
      {
        parameter: 'table',
        patterns: [
          /from (?:the )?(\w+) table/i,
          /in (?:the )?(\w+)(?: table)?/i
        ],
        extractor: (match) => match[1]
      },
      {
        parameter: 'where',
        patterns: [
          /where (.+?)(?:\s+(?:order|group|limit)|\s*$)/i
        ],
        extractor: (match) => match[1].trim()
      }
    ]

    this.patternMatchers.set('mysql_query', dbPatterns)
    this.patternMatchers.set('postgresql_query', dbPatterns)
    this.patternMatchers.set('mongodb_query', dbPatterns)
  }

  private loadDocumentToolPatterns(): void {
    const docPatterns: ExtractionPattern[] = [
      {
        parameter: 'title',
        patterns: [
          /(?:create|make) (?:a )?(?:document|page|note) (?:called|titled|named) "([^"]+)"/i,
          /(?:document|page|note) "([^"]+)"/i
        ],
        extractor: (match) => match[1].trim()
      },
      {
        parameter: 'content',
        patterns: [
          /(?:with content|containing|write)[:\s]+"([^"]+)"/i,
          /(?:content|text)[:\s]+(.+?)(?:\s*$)/i
        ],
        extractor: (match) => match[1].trim()
      }
    ]

    this.patternMatchers.set('notion_create', docPatterns)
    this.patternMatchers.set('google_docs_create', docPatterns)
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private resolveEntityConflicts(entities: ParameterEntity[]): ParameterEntity[] {
    // Sort by position to detect overlaps
    const sorted = entities.sort((a, b) => a.position[0] - b.position[0])
    const resolved: ParameterEntity[] = []

    for (const entity of sorted) {
      // Check if this entity overlaps with any already resolved entity
      const hasOverlap = resolved.some(existing =>
        this.entitiesOverlap(entity, existing)
      )

      if (!hasOverlap) {
        resolved.push(entity)
      } else {
        // Keep the one with higher confidence
        const overlappingIndex = resolved.findIndex(existing =>
          this.entitiesOverlap(entity, existing)
        )

        if (overlappingIndex !== -1 && entity.confidence > resolved[overlappingIndex].confidence) {
          resolved[overlappingIndex] = entity
        }
      }
    }

    return resolved
  }

  private entitiesOverlap(a: ParameterEntity, b: ParameterEntity): boolean {
    return !(a.position[1] <= b.position[0] || b.position[1] <= a.position[0])
  }

  private mapEntityToParameter(entity: ParameterEntity): string | null {
    // Map entity types to common parameter names
    const mappings: Record<string, string[]> = {
      'email': ['to', 'from', 'cc', 'bcc', 'email', 'recipient'],
      'url': ['url', 'link', 'website', 'endpoint'],
      'date': ['date', 'start_date', 'end_date', 'due_date'],
      'time': ['time', 'start_time', 'end_time'],
      'number': ['amount', 'count', 'quantity', 'id', 'number'],
      'boolean': ['enabled', 'active', 'public', 'private'],
      'file': ['file', 'attachment', 'document']
    }

    return mappings[entity.type]?.[0] || null
  }

  private async validateParameterValue(value: any, paramConfig: any): Promise<any> {
    // Basic type validation and transformation
    const expectedType = paramConfig.type

    switch (expectedType) {
      case 'string':
        return String(value)
      case 'number':
        const num = Number(value)
        return isNaN(num) ? null : num
      case 'boolean':
        return this.parseBoolean(value)
      case 'array':
        return Array.isArray(value) ? value : [value]
      default:
        return value
    }
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      return ['true', 'yes', 'on', '1', 'enabled'].includes(lower)
    }
    return Boolean(value)
  }

  private parseTime(timeStr: string): string {
    // Parse time string into standardized format
    // Implementation would handle various time formats
    return timeStr.trim()
  }

  private calculateOverallConfidence(
    entities: ParameterEntity[],
    patterns: Record<string, any>,
    inferred: Record<string, any>
  ): number {
    let totalWeight = 0
    let weightedConfidence = 0

    // Entities contribute based on their confidence
    entities.forEach(entity => {
      totalWeight += 1
      weightedConfidence += entity.confidence
    })

    // Pattern matches have high confidence
    Object.keys(patterns).forEach(() => {
      totalWeight += 1
      weightedConfidence += 0.9
    })

    // Inferred parameters have lower confidence
    Object.keys(inferred).forEach(() => {
      totalWeight += 1
      weightedConfidence += 0.6
    })

    return totalWeight > 0 ? weightedConfidence / totalWeight : 0
  }

  // Parameter suggestion and clarification methods
  private createParameterPrompt(paramName: string, paramConfig: any, context?: UsageContext): ConversationPrompt {
    return {
      parameter: paramName,
      message: `What would you like to use for ${paramName}?`,
      type: 'question',
      hints: paramConfig?.description ? [paramConfig.description] : []
    }
  }

  private async getContextualSuggestion(parameter: string, context: UsageContext): Promise<ParameterSuggestion | null> {
    // Implementation would analyze context for relevant suggestions
    return null
  }

  private getHistoricalSuggestion(parameter: string, messageHistory: any[]): ParameterSuggestion | null {
    // Implementation would analyze message history for patterns
    return null
  }

  private getDefaultSuggestion(parameter: string, paramConfig: any): ParameterSuggestion | null {
    // Implementation would provide default value suggestions
    return null
  }

  private generateMissingParameterMessage(paramName: string, paramConfig: any, context?: UsageContext): string {
    return `I need a value for ${paramName}. ${paramConfig.description || ''}`
  }

  private generateParameterSuggestionTexts(paramName: string, paramConfig: any): string[] {
    return []
  }

  private generateParameterExamples(paramName: string, paramConfig: any): string[] {
    return []
  }

  private suggestParameterImprovement(
    paramName: string,
    value: any,
    tool: ToolConfig,
    context?: UsageContext
  ): ParameterSuggestion | null {
    return null
  }

  private suggestOptionalParameter(
    paramName: string,
    paramConfig: any,
    context?: UsageContext
  ): ParameterSuggestion | null {
    return null
  }
}

// =============================================================================
// Entity Extractors
// =============================================================================

abstract class EntityExtractor {
  abstract extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]>
}

class EmailExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    const matches = [...text.matchAll(emailRegex)]

    return matches.map(match => ({
      name: 'email',
      value: match[0],
      confidence: 0.95,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class URLExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
    const matches = [...text.matchAll(urlRegex)]

    return matches.map(match => ({
      name: 'url',
      value: match[0],
      confidence: 0.9,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class DateExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    // Implementation would use more sophisticated date parsing
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g
    const matches = [...text.matchAll(dateRegex)]

    return matches.map(match => ({
      name: 'date',
      value: new Date(match[0]).toISOString().split('T')[0],
      confidence: 0.8,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class TimeExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const timeRegex = /\b\d{1,2}:\d{2}(?:\s*[ap]m)?\b/gi
    const matches = [...text.matchAll(timeRegex)]

    return matches.map(match => ({
      name: 'time',
      value: match[0],
      confidence: 0.85,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class NumberExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const numberRegex = /\b\d+(?:\.\d+)?\b/g
    const matches = [...text.matchAll(numberRegex)]

    return matches.map(match => ({
      name: 'number',
      value: parseFloat(match[0]),
      confidence: 0.7,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class BooleanExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const booleanRegex = /\b(?:true|false|yes|no|on|off|enabled?|disabled?)\b/gi
    const matches = [...text.matchAll(booleanRegex)]

    return matches.map(match => ({
      name: 'boolean',
      value: ['true', 'yes', 'on', 'enabled', 'enable'].includes(match[0].toLowerCase()),
      confidence: 0.8,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

class FileExtractor extends EntityExtractor {
  async extract(text: string): Promise<Omit<ParameterEntity, 'type'>[]> {
    const fileRegex = /\b[\w\-. ]+\.(?:pdf|doc|docx|txt|csv|xlsx|jpg|png|gif)\b/gi
    const matches = [...text.matchAll(fileRegex)]

    return matches.map(match => ({
      name: 'file',
      value: match[0],
      confidence: 0.85,
      position: [match.index!, match.index! + match[0].length] as [number, number],
      source: match[0]
    }))
  }
}

// =============================================================================
// Supporting Classes
// =============================================================================

class ContextualInferenceEngine {
  async infer(
    message: string,
    tool: ToolConfig,
    context?: UsageContext,
    previousParams?: Record<string, any>
  ): Promise<Record<string, any>> {
    const inferred: Record<string, any> = {}

    // Infer from context
    if (context) {
      // User context inferences
      if (context.userProfile) {
        // Implementation would infer based on user profile
      }

      // Workflow context inferences
      if (context.workflowVariables) {
        // Implementation would infer from workflow state
      }

      // Time context inferences
      if (context.timeOfDay) {
        // Implementation would infer time-based defaults
      }
    }

    return inferred
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface ConversationPrompt {
  parameter: string
  message: string
  type: 'question' | 'confirmation' | 'suggestion'
  hints: string[]
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createParameterParser(): ConversationalParameterParser {
  return new ConversationalParameterParser()
}

export async function parseNaturalLanguageParameters(
  input: ConversationalInput,
  tool: ToolConfig
): Promise<ParsedParameters> {
  const parser = createParameterParser()
  return parser.parseParameters(input, tool)
}