/**
 * Canned Response Management Service
 * =================================
 *
 * Enterprise-grade canned response system with intelligent matching,
 * personalization, branding compliance, and multi-language support.
 * Provides context-aware response selection with approval workflows.
 *
 * Key Features:
 * - Smart response matching based on context and intent
 * - Dynamic personalization with template variables
 * - Brand compliance and voice consistency
 * - Multi-language support with localization
 * - Approval workflows for compliance validation
 * - Usage analytics and effectiveness tracking
 * - Integration with governance policies
 */

import type {
  BrandingConfig,
  CannedResponse,
  CannedResponseMatch,
  CreateCannedResponseRequest,
  PersonalizationField,
  ResponseCategory,
  UpdateCannedResponseRequest,
} from './governance-compliance-types'
import type { AuthContext } from './types'

/**
 * Canned Response Management Service
 * Provides intelligent response management with personalization and branding
 */
export class CannedResponseService {
  private readonly responseCache = new Map<string, CannedResponse>()
  private readonly categoryIndex = new Map<ResponseCategory, string[]>()
  private readonly tagIndex = new Map<string, string[]>()
  private readonly languageIndex = new Map<string, string[]>()
  private readonly usageStats = new Map<string, { count: number; lastUsed: Date }>()

  constructor(
    private readonly config: {
      enablePersonalization?: boolean
      enableBrandingValidation?: boolean
      defaultLanguage?: string
      maxResponsesPerCategory?: number
      enableUsageTracking?: boolean
    } = {}
  ) {
    this.initializeDefaultResponses()
  }

  /**
   * Create a new canned response
   */
  async createResponse(
    responseData: CreateCannedResponseRequest,
    workspaceId: string,
    auth: AuthContext
  ): Promise<CannedResponse> {
    try {
      const response: CannedResponse = {
        id: this.generateId('response'),
        workspace_id: workspaceId,
        title: responseData.title,
        content: responseData.content,
        category: responseData.category,
        tags: responseData.tags || [],
        language: responseData.language || this.config.defaultLanguage || 'en',
        context_requirements: responseData.context_requirements || [],
        branding: responseData.branding,
        personalization_fields: responseData.personalization_fields || [],
        approval_required: responseData.approval_required || false,
        usage_count: 0,
        compliance_validated: false,
        status: responseData.approval_required ? 'pending_approval' : 'active',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: auth.user_id,
      }

      // Validate response content and branding
      await this.validateResponseContent(response)

      // Store response
      this.responseCache.set(response.id, response)

      // Update indexes
      this.updateIndexes(response)

      console.log(`[CannedResponse] Created response: ${response.title} (${response.id})`)
      return response
    } catch (error) {
      console.error('[CannedResponse] Failed to create response:', error)
      throw new Error(`Failed to create canned response: ${error}`)
    }
  }

  /**
   * Update an existing canned response
   */
  async updateResponse(
    responseId: string,
    updates: UpdateCannedResponseRequest,
    auth: AuthContext
  ): Promise<CannedResponse> {
    try {
      const existingResponse = this.responseCache.get(responseId)
      if (!existingResponse) {
        throw new Error(`Response not found: ${responseId}`)
      }

      const updatedResponse: CannedResponse = {
        ...existingResponse,
        ...updates,
        updated_at: new Date().toISOString(),
        version: existingResponse.version + 1,
        // Reset compliance validation if content changed
        compliance_validated:
          updates.content !== existingResponse.content
            ? false
            : existingResponse.compliance_validated,
      }

      // Validate updated content
      await this.validateResponseContent(updatedResponse)

      // Update cache and indexes
      this.responseCache.set(responseId, updatedResponse)
      this.updateIndexes(updatedResponse)

      console.log(
        `[CannedResponse] Updated response: ${updatedResponse.title} (v${updatedResponse.version})`
      )
      return updatedResponse
    } catch (error) {
      console.error('[CannedResponse] Failed to update response:', error)
      throw new Error(`Failed to update canned response: ${error}`)
    }
  }

  /**
   * Find matching canned responses for given context and query
   */
  async findMatchingResponses(
    query: string,
    category?: ResponseCategory,
    context?: Record<string, any>,
    workspaceId?: string,
    options: {
      limit?: number
      language?: string
      includePersonalization?: boolean
      requireCompliance?: boolean
    } = {}
  ): Promise<CannedResponseMatch[]> {
    try {
      const startTime = Date.now()
      const matches: CannedResponseMatch[] = []

      // Get candidate responses
      let candidates = Array.from(this.responseCache.values())

      // Filter by workspace
      if (workspaceId) {
        candidates = candidates.filter((r) => r.workspace_id === workspaceId)
      }

      // Filter by category
      if (category) {
        candidates = candidates.filter((r) => r.category === category)
      }

      // Filter by language
      const language = options.language || this.config.defaultLanguage || 'en'
      candidates = candidates.filter((r) => r.language === language)

      // Filter by status
      candidates = candidates.filter((r) => r.status === 'active')

      // Filter by compliance if required
      if (options.requireCompliance) {
        candidates = candidates.filter((r) => r.compliance_validated)
      }

      // Score and match candidates
      for (const response of candidates) {
        const match = await this.calculateResponseMatch(response, query, context)
        if (match.relevance_score > 0.3) {
          // Minimum relevance threshold
          matches.push(match)
        }
      }

      // Sort by relevance score
      matches.sort((a, b) => b.relevance_score - a.relevance_score)

      // Apply limit
      const limit = options.limit || 10
      const limitedMatches = matches.slice(0, limit)

      const duration = Date.now() - startTime
      console.log(
        `[CannedResponse] Found ${limitedMatches.length} matches in ${duration}ms for query: "${query.substring(0, 50)}..."`
      )

      return limitedMatches
    } catch (error) {
      console.error('[CannedResponse] Failed to find matching responses:', error)
      throw new Error(`Failed to find matching responses: ${error}`)
    }
  }

  /**
   * Get personalized response content
   */
  async getPersonalizedResponse(
    responseId: string,
    personalizationData: Record<string, any>,
    auth: AuthContext
  ): Promise<{
    content: string
    missing_fields: string[]
    personalization_applied: boolean
  }> {
    try {
      const response = this.responseCache.get(responseId)
      if (!response) {
        throw new Error(`Response not found: ${responseId}`)
      }

      // Track usage
      await this.trackResponseUsage(responseId)

      // Apply personalization if enabled
      if (this.config.enablePersonalization && response.personalization_fields) {
        return this.personalizeContent(response, personalizationData)
      }

      return {
        content: response.content,
        missing_fields: [],
        personalization_applied: false,
      }
    } catch (error) {
      console.error('[CannedResponse] Failed to get personalized response:', error)
      throw new Error(`Failed to get personalized response: ${error}`)
    }
  }

  /**
   * Get responses by category
   */
  async getResponsesByCategory(
    category: ResponseCategory,
    workspaceId: string,
    options: {
      language?: string
      includeInactive?: boolean
      limit?: number
    } = {}
  ): Promise<CannedResponse[]> {
    try {
      const responseIds = this.categoryIndex.get(category) || []
      const responses = responseIds
        .map((id) => this.responseCache.get(id))
        .filter((response): response is CannedResponse => {
          if (!response || response.workspace_id !== workspaceId) return false

          if (options.language && response.language !== options.language) return false

          if (!options.includeInactive && response.status !== 'active') return false

          return true
        })
        .sort((a, b) => b.usage_count - a.usage_count)

      const limit = options.limit || 50
      return responses.slice(0, limit)
    } catch (error) {
      console.error('[CannedResponse] Failed to get responses by category:', error)
      throw new Error(`Failed to get responses by category: ${error}`)
    }
  }

  /**
   * Get response analytics and usage statistics
   */
  async getResponseAnalytics(
    workspaceId: string,
    options: {
      timeframe?: 'day' | 'week' | 'month' | 'year'
      category?: ResponseCategory
      includeEffectiveness?: boolean
    } = {}
  ): Promise<{
    total_responses: number
    active_responses: number
    usage_stats: Array<{
      response_id: string
      title: string
      usage_count: number
      last_used?: string
      effectiveness_score?: number
    }>
    category_breakdown: Record<ResponseCategory, number>
    top_performing: Array<{
      response_id: string
      title: string
      score: number
    }>
  }> {
    try {
      const workspaceResponses = Array.from(this.responseCache.values()).filter(
        (r) => r.workspace_id === workspaceId
      )

      const activeResponses = workspaceResponses.filter((r) => r.status === 'active')

      // Generate usage statistics
      const usageStats = workspaceResponses.map((response) => {
        const usage = this.usageStats.get(response.id)
        return {
          response_id: response.id,
          title: response.title,
          usage_count: response.usage_count,
          last_used: usage?.lastUsed.toISOString(),
          effectiveness_score: response.effectiveness_score,
        }
      })

      // Category breakdown
      const categoryBreakdown = {} as Record<ResponseCategory, number>
      for (const response of workspaceResponses) {
        categoryBreakdown[response.category] = (categoryBreakdown[response.category] || 0) + 1
      }

      // Top performing responses
      const topPerforming = workspaceResponses
        .filter((r) => r.effectiveness_score !== undefined)
        .sort((a, b) => (b.effectiveness_score || 0) - (a.effectiveness_score || 0))
        .slice(0, 10)
        .map((r) => ({
          response_id: r.id,
          title: r.title,
          score: r.effectiveness_score || 0,
        }))

      return {
        total_responses: workspaceResponses.length,
        active_responses: activeResponses.length,
        usage_stats: usageStats,
        category_breakdown: categoryBreakdown,
        top_performing: topPerforming,
      }
    } catch (error) {
      console.error('[CannedResponse] Failed to get analytics:', error)
      throw new Error(`Failed to get response analytics: ${error}`)
    }
  }

  /**
   * Approve a pending canned response
   */
  async approveResponse(
    responseId: string,
    approvalData: {
      approved_by: string
      compliance_notes?: string
      effectiveness_prediction?: number
    },
    auth: AuthContext
  ): Promise<CannedResponse> {
    try {
      const response = this.responseCache.get(responseId)
      if (!response) {
        throw new Error(`Response not found: ${responseId}`)
      }

      if (response.status !== 'pending_approval') {
        throw new Error(`Response is not pending approval: ${response.status}`)
      }

      const approvedResponse: CannedResponse = {
        ...response,
        status: 'active',
        approved_by: approvalData.approved_by,
        approved_at: new Date().toISOString(),
        compliance_validated: true,
        effectiveness_score: approvalData.effectiveness_prediction,
        updated_at: new Date().toISOString(),
      }

      this.responseCache.set(responseId, approvedResponse)
      this.updateIndexes(approvedResponse)

      console.log(
        `[CannedResponse] Response approved: ${approvedResponse.title} by ${approvalData.approved_by}`
      )
      return approvedResponse
    } catch (error) {
      console.error('[CannedResponse] Failed to approve response:', error)
      throw new Error(`Failed to approve response: ${error}`)
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async validateResponseContent(response: CannedResponse): Promise<void> {
    // Validate required fields
    if (!response.title || response.title.trim().length === 0) {
      throw new Error('Response title is required')
    }

    if (!response.content || response.content.trim().length === 0) {
      throw new Error('Response content is required')
    }

    // Validate branding if enabled
    if (this.config.enableBrandingValidation && response.branding) {
      await this.validateBranding(response.content, response.branding)
    }

    // Validate personalization fields
    if (response.personalization_fields) {
      this.validatePersonalizationFields(response.content, response.personalization_fields)
    }
  }

  private async validateBranding(content: string, branding: BrandingConfig): Promise<void> {
    // Check for avoided terms
    if (branding.avoid_terms) {
      for (const term of branding.avoid_terms) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
          throw new Error(`Content contains avoided term: "${term}"`)
        }
      }
    }

    // Validate brand voice keywords are present (at least one)
    if (branding.brand_voice_keywords && branding.brand_voice_keywords.length > 0) {
      const hasKeyword = branding.brand_voice_keywords.some((keyword) =>
        content.toLowerCase().includes(keyword.toLowerCase())
      )
      if (!hasKeyword) {
        console.warn('[CannedResponse] Content does not include any brand voice keywords')
      }
    }
  }

  private validatePersonalizationFields(content: string, fields: PersonalizationField[]): void {
    for (const field of fields) {
      const placeholder = `{{${field.field_name}}}`
      if (field.required && !content.includes(placeholder)) {
        throw new Error(`Required personalization field missing: ${field.field_name}`)
      }
    }
  }

  private async calculateResponseMatch(
    response: CannedResponse,
    query: string,
    context?: Record<string, any>
  ): Promise<CannedResponseMatch> {
    let relevanceScore = 0
    const missingContext: string[] = []

    // Basic text similarity (simplified - in production would use NLP)
    const queryWords = query.toLowerCase().split(/\s+/)
    const responseWords = `${response.title} ${response.content}`.toLowerCase().split(/\s+/)

    let matchingWords = 0
    for (const word of queryWords) {
      if (responseWords.some((rWord) => rWord.includes(word) || word.includes(rWord))) {
        matchingWords++
      }
    }

    const textSimilarity = queryWords.length > 0 ? matchingWords / queryWords.length : 0
    relevanceScore += textSimilarity * 0.6

    // Tag matching
    if (response.tags && response.tags.length > 0) {
      const queryLower = query.toLowerCase()
      const tagMatches = response.tags.filter(
        (tag) => queryLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(queryLower)
      ).length

      if (tagMatches > 0) {
        relevanceScore += (tagMatches / response.tags.length) * 0.3
      }
    }

    // Context requirements checking
    if (response.context_requirements && response.context_requirements.length > 0) {
      let contextMatches = 0
      for (const requirement of response.context_requirements) {
        if (context && context[requirement.field] !== undefined) {
          contextMatches++
        } else if (requirement.required) {
          missingContext.push(requirement.field)
          relevanceScore *= 0.8 // Penalty for missing required context
        }
      }

      if (response.context_requirements.length > 0) {
        relevanceScore += (contextMatches / response.context_requirements.length) * 0.1
      }
    }

    // Usage-based scoring (popular responses get slight boost)
    if (response.usage_count > 0) {
      const usageBoost = Math.min(0.1, response.usage_count / 100)
      relevanceScore += usageBoost
    }

    // Effectiveness scoring
    if (response.effectiveness_score) {
      relevanceScore += (response.effectiveness_score / 100) * 0.1
    }

    // Generate personalized content
    const personalizedContent = await this.generatePersonalizedContent(response, context)

    return {
      response,
      relevance_score: Math.min(1.0, relevanceScore),
      personalized_content: personalizedContent,
      missing_context: missingContext,
      compliance_validated: response.compliance_validated,
    }
  }

  private async generatePersonalizedContent(
    response: CannedResponse,
    context?: Record<string, any>
  ): Promise<string> {
    let content = response.content

    if (!this.config.enablePersonalization || !response.personalization_fields || !context) {
      return content
    }

    // Replace personalization placeholders
    for (const field of response.personalization_fields) {
      const placeholder = `{{${field.field_name}}}`
      const value = context[field.field_name] || field.fallback_value || `[${field.field_name}]`
      content = content.replace(new RegExp(placeholder, 'g'), value)
    }

    return content
  }

  private personalizeContent(
    response: CannedResponse,
    personalizationData: Record<string, any>
  ): {
    content: string
    missing_fields: string[]
    personalization_applied: boolean
  } {
    let content = response.content
    const missingFields: string[] = []
    let personalizationApplied = false

    if (response.personalization_fields) {
      for (const field of response.personalization_fields) {
        const placeholder = `{{${field.field_name}}}`
        const value = personalizationData[field.field_name]

        if (value !== undefined) {
          content = content.replace(new RegExp(placeholder, 'g'), value)
          personalizationApplied = true
        } else if (field.required) {
          missingFields.push(field.field_name)
        } else if (field.fallback_value) {
          content = content.replace(new RegExp(placeholder, 'g'), field.fallback_value)
          personalizationApplied = true
        }
      }
    }

    return {
      content,
      missing_fields: missingFields,
      personalization_applied: personalizationApplied,
    }
  }

  private async trackResponseUsage(responseId: string): Promise<void> {
    if (!this.config.enableUsageTracking) return

    const response = this.responseCache.get(responseId)
    if (response) {
      response.usage_count++
      this.usageStats.set(responseId, {
        count: response.usage_count,
        lastUsed: new Date(),
      })
    }
  }

  private updateIndexes(response: CannedResponse): void {
    // Update category index
    if (!this.categoryIndex.has(response.category)) {
      this.categoryIndex.set(response.category, [])
    }
    const categoryResponses = this.categoryIndex.get(response.category)!
    if (!categoryResponses.includes(response.id)) {
      categoryResponses.push(response.id)
    }

    // Update tag index
    for (const tag of response.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, [])
      }
      const tagResponses = this.tagIndex.get(tag)!
      if (!tagResponses.includes(response.id)) {
        tagResponses.push(response.id)
      }
    }

    // Update language index
    if (!this.languageIndex.has(response.language)) {
      this.languageIndex.set(response.language, [])
    }
    const languageResponses = this.languageIndex.get(response.language)!
    if (!languageResponses.includes(response.id)) {
      languageResponses.push(response.id)
    }
  }

  private initializeDefaultResponses(): void {
    // Initialize with common default responses
    const defaultResponses = this.createDefaultResponses()

    for (const response of defaultResponses) {
      this.responseCache.set(response.id, response)
      this.updateIndexes(response)
    }

    console.log(`[CannedResponse] Initialized with ${defaultResponses.length} default responses`)
  }

  private createDefaultResponses(): CannedResponse[] {
    const now = new Date().toISOString()

    return [
      {
        id: this.generateId('response'),
        workspace_id: 'default',
        title: 'Professional Greeting',
        content:
          'Hello {{customer_name}}, thank you for contacting us. How may I assist you today?',
        category: 'greeting',
        tags: ['greeting', 'professional', 'standard'],
        language: 'en',
        context_requirements: [{ field: 'customer_name', required: false, default_value: 'there' }],
        personalization_fields: [
          {
            field_name: 'customer_name',
            placeholder: '{{customer_name}}',
            data_source: 'user_profile',
            required: false,
            fallback_value: 'there',
          },
        ],
        branding: {
          tone: 'professional',
          brand_voice_keywords: ['assist', 'help', 'support'],
          avoid_terms: ['problem', 'issue'],
          required_disclaimers: [],
        },
        approval_required: false,
        usage_count: 0,
        effectiveness_score: 85,
        compliance_validated: true,
        status: 'active',
        version: 1,
        created_at: now,
        updated_at: now,
        created_by: 'system',
      },
      {
        id: this.generateId('response'),
        workspace_id: 'default',
        title: 'Escalation to Human Agent',
        content:
          'I understand this requires additional attention. Let me connect you with one of our specialized team members who can better assist you. Please hold for just a moment.',
        category: 'escalation',
        tags: ['escalation', 'human', 'handoff'],
        language: 'en',
        context_requirements: [],
        personalization_fields: [],
        branding: {
          tone: 'professional',
          brand_voice_keywords: ['specialized', 'assist', 'team'],
          avoid_terms: ["can't help", 'unable'],
          required_disclaimers: [],
        },
        approval_required: false,
        usage_count: 0,
        effectiveness_score: 92,
        compliance_validated: true,
        status: 'active',
        version: 1,
        created_at: now,
        updated_at: now,
        created_by: 'system',
      },
      {
        id: this.generateId('response'),
        workspace_id: 'default',
        title: 'Privacy Information Request',
        content:
          'For privacy and security reasons, I cannot access or modify personal account information through this channel. Please log into your account directly or contact our secure support line at {{support_phone}} for account-related inquiries.',
        category: 'compliance',
        tags: ['privacy', 'security', 'account', 'compliance'],
        language: 'en',
        context_requirements: [{ field: 'support_phone', required: true }],
        personalization_fields: [
          {
            field_name: 'support_phone',
            placeholder: '{{support_phone}}',
            data_source: 'custom',
            required: true,
          },
        ],
        branding: {
          tone: 'professional',
          brand_voice_keywords: ['privacy', 'security', 'secure'],
          avoid_terms: [],
          required_disclaimers: ['For privacy and security reasons'],
        },
        approval_required: true,
        usage_count: 0,
        compliance_validated: true,
        status: 'active',
        version: 1,
        created_at: now,
        updated_at: now,
        created_by: 'system',
      },
    ]
  }

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`
  }
}

// ==================== SERVICE INSTANCE ====================

export const cannedResponseService = new CannedResponseService({
  enablePersonalization: true,
  enableBrandingValidation: true,
  defaultLanguage: 'en',
  maxResponsesPerCategory: 100,
  enableUsageTracking: true,
})

// ==================== UTILITY FUNCTIONS ====================

/**
 * Quick response suggestion for a given query
 */
export async function suggestResponse(
  query: string,
  workspaceId: string,
  context?: Record<string, any>
): Promise<CannedResponseMatch | null> {
  try {
    const matches = await cannedResponseService.findMatchingResponses(
      query,
      undefined,
      context,
      workspaceId,
      { limit: 1, requireCompliance: true }
    )

    return matches.length > 0 ? matches[0] : null
  } catch (error) {
    console.error('[CannedResponse] Failed to suggest response:', error)
    return null
  }
}

/**
 * Get response with personalization applied
 */
export async function getPersonalizedResponse(
  responseId: string,
  personalizationData: Record<string, any>,
  auth: AuthContext
): Promise<string> {
  try {
    const result = await cannedResponseService.getPersonalizedResponse(
      responseId,
      personalizationData,
      auth
    )

    if (result.missing_fields.length > 0) {
      console.warn(
        `[CannedResponse] Missing personalization fields: ${result.missing_fields.join(', ')}`
      )
    }

    return result.content
  } catch (error) {
    console.error('[CannedResponse] Failed to get personalized response:', error)
    throw error
  }
}
