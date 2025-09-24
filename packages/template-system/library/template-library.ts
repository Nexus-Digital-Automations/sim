/**
 * Template Library - Comprehensive Template Management and Discovery
 * ================================================================
 *
 * This module provides a comprehensive template library system with
 * built-in templates for common patterns, template discovery,
 * recommendation engine, and template management capabilities.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  WorkflowTemplate,
  TemplateParameter,
  TemplateSearchFilters,
  TemplateSearchResult,
  TemplateAnalytics,
  TemplateMixin,
} from '../types/template-types'
import { JourneyGenerationRequest } from '../types/journey-types'

export class TemplateLibrary {
  private readonly builtInTemplates = new Map<string, WorkflowTemplate>()
  private readonly templateCache = new Map<string, WorkflowTemplate>()
  private readonly recommendationEngine = new TemplateRecommendationEngine()
  private readonly patternMatcher = new TemplatePatternMatcher()

  constructor() {
    this.initializeBuiltInTemplates()
  }

  /**
   * Search templates with filters and ranking
   */
  async searchTemplates(
    filters: TemplateSearchFilters,
    workspaceId: string,
    userId?: string
  ): Promise<TemplateSearchResult> {
    console.log(`Searching templates with filters:`, filters)

    // Get all available templates
    const allTemplates = await this.getAllTemplates(workspaceId, filters.isPublic)

    // Apply filters
    let filteredTemplates = this.applyFilters(allTemplates, filters)

    // Apply ranking
    filteredTemplates = await this.rankTemplates(filteredTemplates, filters, userId)

    // Generate facets
    const facets = this.generateFacets(allTemplates)

    // Get suggestions
    const suggestions = await this.generateSearchSuggestions(filters, allTemplates)

    // Get related templates
    const relatedTemplates = await this.getRelatedTemplates(filteredTemplates.slice(0, 5), workspaceId)

    return {
      templates: filteredTemplates,
      totalCount: filteredTemplates.length,
      facets,
      suggestions,
      relatedTemplates,
    }
  }

  /**
   * Get template recommendations for a user
   */
  async getRecommendations(
    userId: string,
    workspaceId: string,
    context?: RecommendationContext
  ): Promise<WorkflowTemplate[]> {
    return await this.recommendationEngine.getRecommendations(userId, workspaceId, context)
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string, workspaceId: string): Promise<WorkflowTemplate | null> {
    // Check cache first
    const cacheKey = `${workspaceId}:${templateId}`
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!
    }

    // Check built-in templates
    if (this.builtInTemplates.has(templateId)) {
      const template = this.builtInTemplates.get(templateId)!
      this.templateCache.set(cacheKey, template)
      return template
    }

    // Load from database (not implemented in this example)
    const template = await this.loadTemplateFromDatabase(templateId, workspaceId)
    if (template) {
      this.templateCache.set(cacheKey, template)
    }

    return template
  }

  /**
   * Create a new template
   */
  async createTemplate(
    templateData: Partial<WorkflowTemplate>,
    workspaceId: string,
    userId: string
  ): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      id: templateData.id || uuidv4(),
      workspaceId,
      name: templateData.name || 'Untitled Template',
      description: templateData.description,
      workflowId: templateData.workflowId || '',
      version: templateData.version || '1.0.0',
      parameters: templateData.parameters || [],
      workflowData: templateData.workflowData || {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: true,
          cacheStrategy: {
            scope: 'user',
            duration: 300,
            invalidationRules: [],
            compressionEnabled: false,
          },
          prefetchParameters: false,
          optimizeRendering: true,
          lazyLoadBlocks: false,
          compressionLevel: 'basic',
        },
      },
      tags: templateData.tags || [],
      parentTemplateId: templateData.parentTemplateId,
      mixins: templateData.mixins || [],
      overrides: templateData.overrides || {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: templateData.category || 'general',
      difficulty: templateData.difficulty || 'beginner',
      estimatedCompletionTime: templateData.estimatedCompletionTime,
      usageCount: 0,
      averageRating: 0,
      totalRatings: 0,
      author: templateData.author || 'Unknown',
      authorId: userId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: templateData.isPublic || false,
      isVerified: false,
      isDeprecated: false,
      localizations: templateData.localizations || {},
    }

    // Validate template
    const validationResult = await this.validateTemplate(template)
    if (!validationResult.isValid) {
      throw new TemplateValidationError('Template validation failed', validationResult.errors)
    }

    // Save to database (not implemented in this example)
    await this.saveTemplateToDatabase(template)

    // Update cache
    const cacheKey = `${workspaceId}:${template.id}`
    this.templateCache.set(cacheKey, template)

    console.log(`Created template ${template.id}: ${template.name}`)
    return template
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<WorkflowTemplate>,
    workspaceId: string,
    userId: string
  ): Promise<WorkflowTemplate> {
    const existingTemplate = await this.getTemplate(templateId, workspaceId)
    if (!existingTemplate) {
      throw new Error(`Template ${templateId} not found`)
    }

    const updatedTemplate: WorkflowTemplate = {
      ...existingTemplate,
      ...updates,
      id: templateId, // Ensure ID doesn't change
      workspaceId, // Ensure workspace doesn't change
      updatedAt: new Date(),
    }

    // Validate updated template
    const validationResult = await this.validateTemplate(updatedTemplate)
    if (!validationResult.isValid) {
      throw new TemplateValidationError('Template validation failed', validationResult.errors)
    }

    // Save to database
    await this.saveTemplateToDatabase(updatedTemplate)

    // Update cache
    const cacheKey = `${workspaceId}:${templateId}`
    this.templateCache.set(cacheKey, updatedTemplate)

    console.log(`Updated template ${templateId}: ${updatedTemplate.name}`)
    return updatedTemplate
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, workspaceId: string, userId: string): Promise<void> {
    const template = await this.getTemplate(templateId, workspaceId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Check permissions (in a real implementation)
    if (template.createdBy !== userId && !await this.hasDeletePermission(userId, workspaceId)) {
      throw new Error('Insufficient permissions to delete template')
    }

    // Delete from database
    await this.deleteTemplateFromDatabase(templateId, workspaceId)

    // Remove from cache
    const cacheKey = `${workspaceId}:${templateId}`
    this.templateCache.delete(cacheKey)

    console.log(`Deleted template ${templateId}`)
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(templateId: string, workspaceId: string): Promise<TemplateAnalytics> {
    // This would typically load from analytics database
    return {
      templateId,
      totalUsage: 0,
      uniqueUsers: 0,
      averageUsagePerUser: 0,
      usageByPeriod: [],
      averageGenerationTime: 0,
      averageJourneyDuration: 0,
      completionRate: 0,
      errorRate: 0,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: {},
      userComments: [],
      parameterUsageStats: [],
      journeysGenerated: 0,
      successfulConversions: 0,
      conversionFailures: [],
    }
  }

  /**
   * Find similar templates
   */
  async findSimilarTemplates(
    templateId: string,
    workspaceId: string,
    limit: number = 10
  ): Promise<WorkflowTemplate[]> {
    const sourceTemplate = await this.getTemplate(templateId, workspaceId)
    if (!sourceTemplate) {
      return []
    }

    const allTemplates = await this.getAllTemplates(workspaceId, true)
    return this.patternMatcher.findSimilar(sourceTemplate, allTemplates, limit)
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getAllTemplates(workspaceId: string, includePublic: boolean = true): Promise<WorkflowTemplate[]> {
    const templates: WorkflowTemplate[] = []

    // Add built-in templates
    if (includePublic) {
      templates.push(...Array.from(this.builtInTemplates.values()))
    }

    // Add workspace templates (would load from database)
    const workspaceTemplates = await this.loadWorkspaceTemplates(workspaceId)
    templates.push(...workspaceTemplates)

    return templates
  }

  private applyFilters(templates: WorkflowTemplate[], filters: TemplateSearchFilters): WorkflowTemplate[] {
    let filtered = templates

    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category)
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      )
    }

    if (filters.difficulty) {
      filtered = filtered.filter(t => t.difficulty === filters.difficulty)
    }

    if (filters.author) {
      filtered = filtered.filter(t =>
        t.author.toLowerCase().includes(filters.author!.toLowerCase())
      )
    }

    if (filters.rating) {
      filtered = filtered.filter(t => (t.averageRating || 0) >= filters.rating!)
    }

    if (filters.usageCount) {
      const { min, max } = filters.usageCount
      filtered = filtered.filter(t => {
        const usage = t.usageCount
        return (!min || usage >= min) && (!max || usage <= max)
      })
    }

    if (filters.isPublic !== undefined) {
      filtered = filtered.filter(t => t.isPublic === filters.isPublic)
    }

    if (filters.isVerified !== undefined) {
      filtered = filtered.filter(t => t.isVerified === filters.isVerified)
    }

    if (filters.hasParameters !== undefined) {
      filtered = filtered.filter(t =>
        filters.hasParameters ? t.parameters.length > 0 : t.parameters.length === 0
      )
    }

    if (filters.createdAfter) {
      filtered = filtered.filter(t => t.createdAt >= filters.createdAfter!)
    }

    if (filters.createdBefore) {
      filtered = filtered.filter(t => t.createdAt <= filters.createdBefore!)
    }

    if (filters.query) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  private async rankTemplates(
    templates: WorkflowTemplate[],
    filters: TemplateSearchFilters,
    userId?: string
  ): Promise<WorkflowTemplate[]> {
    // Simple ranking algorithm - in production this would be more sophisticated
    return templates.sort((a, b) => {
      // Primary: usage count
      const usageDiff = b.usageCount - a.usageCount

      // Secondary: rating
      const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0)

      // Tertiary: recency
      const recencyDiff = b.updatedAt.getTime() - a.updatedAt.getTime()

      return usageDiff || ratingDiff || recencyDiff
    })
  }

  private generateFacets(templates: WorkflowTemplate[]): any {
    const categories = new Map<string, number>()
    const tags = new Map<string, number>()
    const authors = new Map<string, number>()
    const difficulties = new Map<string, number>()

    for (const template of templates) {
      // Categories
      categories.set(template.category, (categories.get(template.category) || 0) + 1)

      // Tags
      for (const tag of template.tags) {
        tags.set(tag, (tags.get(tag) || 0) + 1)
      }

      // Authors
      authors.set(template.author, (authors.get(template.author) || 0) + 1)

      // Difficulties
      difficulties.set(template.difficulty, (difficulties.get(template.difficulty) || 0) + 1)
    }

    return {
      categories: Array.from(categories.entries()).map(([category, count]) => ({ category, count })),
      tags: Array.from(tags.entries()).map(([tag, count]) => ({ tag, count })),
      authors: Array.from(authors.entries()).map(([author, count]) => ({ author, count })),
      difficulties: Array.from(difficulties.entries()).map(([difficulty, count]) => ({ difficulty, count })),
    }
  }

  private async generateSearchSuggestions(
    filters: TemplateSearchFilters,
    templates: WorkflowTemplate[]
  ): Promise<string[]> {
    const suggestions: string[] = []

    // Add popular categories
    const categories = new Set(templates.map(t => t.category))
    suggestions.push(...Array.from(categories).slice(0, 3))

    // Add popular tags
    const tagCounts = new Map<string, number>()
    for (const template of templates) {
      for (const tag of template.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }
    const popularTags = Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)

    suggestions.push(...popularTags)

    return suggestions
  }

  private async getRelatedTemplates(
    templates: WorkflowTemplate[],
    workspaceId: string
  ): Promise<WorkflowTemplate[]> {
    // Find templates with similar tags or categories
    const relatedTemplates: WorkflowTemplate[] = []
    const allTemplates = await this.getAllTemplates(workspaceId, true)

    for (const template of templates) {
      const related = allTemplates.filter(t => {
        if (t.id === template.id) return false

        // Same category
        if (t.category === template.category) return true

        // Shared tags
        if (template.tags.some(tag => t.tags.includes(tag))) return true

        return false
      })

      relatedTemplates.push(...related.slice(0, 2))
    }

    // Remove duplicates and limit
    return Array.from(new Set(relatedTemplates)).slice(0, 10)
  }

  private async validateTemplate(template: WorkflowTemplate): Promise<any> {
    const errors: any[] = []

    // Basic validation
    if (!template.name || template.name.trim().length === 0) {
      errors.push({ code: 'INVALID_NAME', message: 'Template name is required' })
    }

    if (!template.workflowId) {
      errors.push({ code: 'INVALID_WORKFLOW_ID', message: 'Workflow ID is required' })
    }

    if (!template.category) {
      errors.push({ code: 'INVALID_CATEGORY', message: 'Template category is required' })
    }

    // Parameter validation
    for (const param of template.parameters) {
      if (!param.name || param.name.trim().length === 0) {
        errors.push({
          code: 'INVALID_PARAMETER_NAME',
          message: `Parameter name is required for parameter ${param.id}`
        })
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  // ============================================================================
  // Database Methods (Stubs)
  // ============================================================================

  private async loadTemplateFromDatabase(templateId: string, workspaceId: string): Promise<WorkflowTemplate | null> {
    // Implementation would load from database
    return null
  }

  private async loadWorkspaceTemplates(workspaceId: string): Promise<WorkflowTemplate[]> {
    // Implementation would load from database
    return []
  }

  private async saveTemplateToDatabase(template: WorkflowTemplate): Promise<void> {
    // Implementation would save to database
  }

  private async deleteTemplateFromDatabase(templateId: string, workspaceId: string): Promise<void> {
    // Implementation would delete from database
  }

  private async hasDeletePermission(userId: string, workspaceId: string): Promise<boolean> {
    // Implementation would check permissions
    return false
  }

  // ============================================================================
  // Built-in Templates Initialization
  // ============================================================================

  private initializeBuiltInTemplates(): void {
    // Customer Onboarding Template
    this.builtInTemplates.set('customer-onboarding', this.createCustomerOnboardingTemplate())

    // Support Ticket Template
    this.builtInTemplates.set('support-ticket', this.createSupportTicketTemplate())

    // Lead Qualification Template
    this.builtInTemplates.set('lead-qualification', this.createLeadQualificationTemplate())

    // Product Demo Template
    this.builtInTemplates.set('product-demo', this.createProductDemoTemplate())

    // Survey Collection Template
    this.builtInTemplates.set('survey-collection', this.createSurveyCollectionTemplate())

    console.log(`Initialized ${this.builtInTemplates.size} built-in templates`)
  }

  private createCustomerOnboardingTemplate(): WorkflowTemplate {
    return {
      id: 'customer-onboarding',
      workspaceId: 'public',
      name: 'Customer Onboarding',
      description: 'A comprehensive customer onboarding flow that guides new users through setup and initial configuration',
      workflowId: 'workflow-customer-onboarding',
      version: '1.0.0',
      parameters: [
        {
          id: 'customer-name',
          name: 'customerName',
          type: 'string',
          description: 'Customer\'s name for personalization',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 100,
          },
          displayOrder: 1,
          defaultValue: '',
        },
        {
          id: 'company-size',
          name: 'companySize',
          type: 'enum',
          description: 'Size of the customer\'s company',
          required: true,
          validation: {
            options: [
              { value: 'small', label: '1-10 employees' },
              { value: 'medium', label: '11-100 employees' },
              { value: 'large', label: '100+ employees' },
            ],
          },
          displayOrder: 2,
          defaultValue: 'small',
        },
      ],
      workflowData: {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: true,
          cacheStrategy: {
            scope: 'user',
            duration: 3600,
            invalidationRules: [],
            compressionEnabled: true,
          },
          prefetchParameters: true,
          optimizeRendering: true,
          lazyLoadBlocks: true,
          compressionLevel: 'basic',
        },
      },
      tags: ['onboarding', 'customer', 'setup', 'beginner'],
      mixins: [],
      overrides: {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: 'customer-success',
      difficulty: 'beginner',
      estimatedCompletionTime: 15,
      usageCount: 1250,
      averageRating: 4.7,
      totalRatings: 342,
      author: 'Sim Team',
      authorId: 'system',
      createdBy: 'system',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-03-15'),
      isPublic: true,
      isVerified: true,
      isDeprecated: false,
      localizations: {
        'en': {
          locale: 'en',
          name: 'Customer Onboarding',
          description: 'A comprehensive customer onboarding flow',
          parameterLabels: {
            'customerName': 'Customer Name',
            'companySize': 'Company Size',
          },
          parameterDescriptions: {
            'customerName': 'Enter the customer\'s full name',
            'companySize': 'Select the size of the customer\'s company',
          },
          blockLabels: {},
          validationMessages: {},
          helpTexts: {},
        },
      },
    }
  }

  private createSupportTicketTemplate(): WorkflowTemplate {
    return {
      id: 'support-ticket',
      workspaceId: 'public',
      name: 'Support Ticket Handler',
      description: 'Automated support ticket processing with escalation and resolution tracking',
      workflowId: 'workflow-support-ticket',
      version: '1.2.0',
      parameters: [
        {
          id: 'ticket-priority',
          name: 'ticketPriority',
          type: 'enum',
          description: 'Priority level of the support ticket',
          required: true,
          validation: {
            options: [
              { value: 'low', label: 'Low Priority' },
              { value: 'medium', label: 'Medium Priority' },
              { value: 'high', label: 'High Priority' },
              { value: 'critical', label: 'Critical' },
            ],
          },
          displayOrder: 1,
          defaultValue: 'medium',
        },
        {
          id: 'category',
          name: 'category',
          type: 'enum',
          description: 'Category of the support request',
          required: true,
          validation: {
            options: [
              { value: 'technical', label: 'Technical Issue' },
              { value: 'billing', label: 'Billing Question' },
              { value: 'feature', label: 'Feature Request' },
              { value: 'other', label: 'Other' },
            ],
          },
          displayOrder: 2,
          defaultValue: 'technical',
        },
      ],
      workflowData: {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: true,
          cacheStrategy: {
            scope: 'session',
            duration: 1800,
            invalidationRules: [],
            compressionEnabled: false,
          },
          prefetchParameters: false,
          optimizeRendering: true,
          lazyLoadBlocks: false,
          compressionLevel: 'basic',
        },
      },
      tags: ['support', 'tickets', 'customer-service', 'automation'],
      mixins: [],
      overrides: {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: 'customer-support',
      difficulty: 'intermediate',
      estimatedCompletionTime: 10,
      usageCount: 892,
      averageRating: 4.4,
      totalRatings: 156,
      author: 'Sim Team',
      authorId: 'system',
      createdBy: 'system',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-03-22'),
      isPublic: true,
      isVerified: true,
      isDeprecated: false,
      localizations: {},
    }
  }

  private createLeadQualificationTemplate(): WorkflowTemplate {
    return {
      id: 'lead-qualification',
      workspaceId: 'public',
      name: 'Lead Qualification',
      description: 'Intelligent lead qualification process with scoring and routing',
      workflowId: 'workflow-lead-qualification',
      version: '1.1.0',
      parameters: [
        {
          id: 'lead-source',
          name: 'leadSource',
          type: 'string',
          description: 'Source of the lead (website, referral, etc.)',
          required: false,
          validation: {
            maxLength: 100,
          },
          displayOrder: 1,
          defaultValue: 'website',
        },
        {
          id: 'qualification-criteria',
          name: 'qualificationCriteria',
          type: 'array',
          description: 'Criteria for qualifying leads',
          required: true,
          validation: {
            minItems: 1,
            maxItems: 10,
          },
          displayOrder: 2,
          defaultValue: ['budget', 'timeline', 'authority', 'need'],
        },
      ],
      workflowData: {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: false,
          cacheStrategy: {
            scope: 'user',
            duration: 600,
            invalidationRules: [],
            compressionEnabled: false,
          },
          prefetchParameters: false,
          optimizeRendering: false,
          lazyLoadBlocks: false,
          compressionLevel: 'none',
        },
      },
      tags: ['sales', 'leads', 'qualification', 'crm'],
      mixins: [],
      overrides: {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: 'sales',
      difficulty: 'intermediate',
      estimatedCompletionTime: 20,
      usageCount: 567,
      averageRating: 4.2,
      totalRatings: 89,
      author: 'Sim Team',
      authorId: 'system',
      createdBy: 'system',
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-03-10'),
      isPublic: true,
      isVerified: true,
      isDeprecated: false,
      localizations: {},
    }
  }

  private createProductDemoTemplate(): WorkflowTemplate {
    return {
      id: 'product-demo',
      workspaceId: 'public',
      name: 'Product Demo',
      description: 'Interactive product demonstration with personalized flow',
      workflowId: 'workflow-product-demo',
      version: '1.0.0',
      parameters: [
        {
          id: 'demo-type',
          name: 'demoType',
          type: 'enum',
          description: 'Type of product demo',
          required: true,
          validation: {
            options: [
              { value: 'overview', label: 'Product Overview' },
              { value: 'feature-focused', label: 'Feature-Focused' },
              { value: 'use-case', label: 'Use Case Demo' },
              { value: 'technical', label: 'Technical Deep Dive' },
            ],
          },
          displayOrder: 1,
          defaultValue: 'overview',
        },
        {
          id: 'duration',
          name: 'duration',
          type: 'number',
          description: 'Demo duration in minutes',
          required: true,
          validation: {
            min: 5,
            max: 60,
          },
          displayOrder: 2,
          defaultValue: 30,
        },
      ],
      workflowData: {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: true,
          cacheStrategy: {
            scope: 'global',
            duration: 7200,
            invalidationRules: [],
            compressionEnabled: true,
          },
          prefetchParameters: true,
          optimizeRendering: true,
          lazyLoadBlocks: true,
          compressionLevel: 'aggressive',
        },
      },
      tags: ['demo', 'sales', 'product', 'presentation'],
      mixins: [],
      overrides: {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: 'sales',
      difficulty: 'beginner',
      estimatedCompletionTime: 35,
      usageCount: 423,
      averageRating: 4.6,
      totalRatings: 78,
      author: 'Sim Team',
      authorId: 'system',
      createdBy: 'system',
      createdAt: new Date('2024-02-15'),
      updatedAt: new Date('2024-03-05'),
      isPublic: true,
      isVerified: true,
      isDeprecated: false,
      localizations: {},
    }
  }

  private createSurveyCollectionTemplate(): WorkflowTemplate {
    return {
      id: 'survey-collection',
      workspaceId: 'public',
      name: 'Survey Collection',
      description: 'Dynamic survey collection with conditional questions and analysis',
      workflowId: 'workflow-survey-collection',
      version: '1.0.0',
      parameters: [
        {
          id: 'survey-title',
          name: 'surveyTitle',
          type: 'string',
          description: 'Title of the survey',
          required: true,
          validation: {
            minLength: 5,
            maxLength: 100,
          },
          displayOrder: 1,
          defaultValue: 'Customer Feedback Survey',
        },
        {
          id: 'question-types',
          name: 'questionTypes',
          type: 'array',
          description: 'Types of questions to include',
          required: true,
          validation: {
            minItems: 1,
            maxItems: 5,
            uniqueItems: true,
          },
          displayOrder: 2,
          defaultValue: ['multiple-choice', 'rating', 'text'],
        },
      ],
      workflowData: {
        blocks: [],
        edges: [],
        variables: {},
        parameterMappings: [],
        conditionalBlocks: [],
        dynamicContent: [],
        optimizationHints: [],
        performanceSettings: {
          enableCaching: false,
          cacheStrategy: {
            scope: 'session',
            duration: 300,
            invalidationRules: [],
            compressionEnabled: false,
          },
          prefetchParameters: false,
          optimizeRendering: true,
          lazyLoadBlocks: false,
          compressionLevel: 'basic',
        },
      },
      tags: ['survey', 'feedback', 'data-collection', 'analytics'],
      mixins: [],
      overrides: {
        parameters: [],
        blocks: [],
        edges: [],
        metadata: {},
      },
      category: 'research',
      difficulty: 'beginner',
      estimatedCompletionTime: 25,
      usageCount: 289,
      averageRating: 4.1,
      totalRatings: 45,
      author: 'Sim Team',
      authorId: 'system',
      createdBy: 'system',
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date('2024-03-20'),
      isPublic: true,
      isVerified: true,
      isDeprecated: false,
      localizations: {},
    }
  }
}

// ============================================================================
// Supporting Classes
// ============================================================================

interface RecommendationContext {
  recentActivity?: string[]
  preferences?: Record<string, any>
  workflowTypes?: string[]
  difficulty?: string
}

class TemplateRecommendationEngine {
  async getRecommendations(
    userId: string,
    workspaceId: string,
    context?: RecommendationContext
  ): Promise<WorkflowTemplate[]> {
    // This would implement sophisticated recommendation logic
    // For now, return empty array
    return []
  }
}

class TemplatePatternMatcher {
  findSimilar(
    sourceTemplate: WorkflowTemplate,
    templates: WorkflowTemplate[],
    limit: number
  ): WorkflowTemplate[] {
    // Simple similarity matching based on tags and category
    return templates
      .filter(t => t.id !== sourceTemplate.id)
      .map(t => ({
        template: t,
        score: this.calculateSimilarity(sourceTemplate, t),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.template)
  }

  private calculateSimilarity(template1: WorkflowTemplate, template2: WorkflowTemplate): number {
    let score = 0

    // Category match
    if (template1.category === template2.category) {
      score += 10
    }

    // Tag matches
    const commonTags = template1.tags.filter(tag => template2.tags.includes(tag))
    score += commonTags.length * 5

    // Difficulty match
    if (template1.difficulty === template2.difficulty) {
      score += 3
    }

    return score
  }
}

class TemplateValidationError extends Error {
  constructor(message: string, public readonly errors: any[]) {
    super(message)
    this.name = 'TemplateValidationError'
  }
}