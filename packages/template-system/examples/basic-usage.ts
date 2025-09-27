/**
 * Basic Template System Usage Examples
 * ====================================
 *
 * This file demonstrates basic usage patterns for the template system,
 * including template creation, journey generation, and common workflows.
 */

import {
  type JourneyGenerationRequest,
  JourneyGenerator,
  TemplateEngine,
  TemplateLibrary,
  type WorkflowTemplate,
} from '../index'

// ============================================================================
// Example 1: Basic Journey Generation
// ============================================================================

async function basicJourneyGeneration() {
  console.log('=== Basic Journey Generation ===')

  const journeyGenerator = new JourneyGenerator()

  try {
    // Generate a journey from the built-in customer onboarding template
    const request: JourneyGenerationRequest = {
      templateId: 'customer-onboarding',
      workflowId: 'onboarding-workflow-123',
      agentId: 'support-agent-456',
      workspaceId: 'acme-corp',
      userId: 'user-789',
      parameters: {
        customerName: 'Jane Smith',
        companySize: 'medium',
        productType: 'enterprise',
        urgency: 'normal',
      },
      options: {
        optimizationLevel: 'standard',
        optimizationTargets: ['performance', 'user_experience'],
        maxStates: 20,
        maxTransitions: 40,
        allowSkipping: true,
        allowRevisiting: false,
        generateDescriptions: true,
        generateHelpTexts: true,
        includeTooltips: true,
        validateGeneration: true,
        runTestConversations: false,
        useCache: true,
        cacheStrategy: 'conservative',
        outputFormat: 'parlant',
        includeMetadata: true,
        includeAnalytics: true,
      },
      context: {
        agentCapabilities: [
          {
            type: 'tool_execution',
            name: 'CRM Integration',
            confidence: 0.95,
          },
          {
            type: 'knowledge_retrieval',
            name: 'Product Documentation',
            confidence: 0.9,
          },
        ],
        availableTools: ['crm-lookup', 'email-sender', 'calendar-scheduler'],
        knowledgeBases: ['product-docs', 'support-articles'],
        workspaceSettings: {
          defaultOptimizationLevel: 'standard',
          maxJourneyDuration: 45, // minutes
          allowedComplexity: 'moderate',
          brandingRequired: true,
          complianceRules: [
            {
              type: 'data_protection',
              rule: 'GDPR compliance required',
              required: true,
            },
          ],
        },
        customizations: [
          {
            type: 'branding',
            configuration: {
              primaryColor: '#0066CC',
              logoUrl: 'https://acme-corp.com/logo.png',
            },
          },
        ],
      },
    }

    const result = await journeyGenerator.generateJourney(request)

    if (result.success && result.journey) {
      console.log('✅ Journey generated successfully!')
      console.log(`   Journey ID: ${result.journey.id}`)
      console.log(`   Title: ${result.journey.title}`)
      console.log(`   States: ${result.journey.states.length}`)
      console.log(`   Transitions: ${result.journey.transitions.length}`)
      console.log(`   Estimated Duration: ${result.journey.estimatedDuration} minutes`)
      console.log(`   Generation Time: ${result.duration}ms`)

      // Show first few states
      console.log('\n   First 3 states:')
      result.journey.states.slice(0, 3).forEach((state, index) => {
        console.log(`   ${index + 1}. ${state.name} (${state.stateType})`)
      })

      if (result.warnings.length > 0) {
        console.log('\n   ⚠️  Warnings:')
        result.warnings.forEach((warning) => {
          console.log(`   - ${warning.message}`)
        })
      }
    } else {
      console.error('❌ Journey generation failed!')
      result.errors.forEach((error) => {
        console.error(`   - ${error.message}`)
      })
    }
  } catch (error) {
    console.error('❌ Error during journey generation:', error)
  }
}

// ============================================================================
// Example 2: Creating a Custom Template
// ============================================================================

async function createCustomTemplate() {
  console.log('\n=== Creating Custom Template ===')

  const templateLibrary = new TemplateLibrary()

  try {
    // Define a custom support ticket template
    const templateData: Partial<WorkflowTemplate> = {
      name: 'Advanced Support Ticket Handler',
      description:
        'Comprehensive support ticket processing with AI-powered categorization and routing',
      workflowId: 'support-workflow-v2',
      category: 'customer-support',
      difficulty: 'intermediate',
      estimatedCompletionTime: 15,
      tags: ['support', 'tickets', 'ai-powered', 'routing'],
      parameters: [
        {
          id: 'ticket-001',
          name: 'ticketId',
          type: 'string',
          description: 'Unique ticket identifier',
          required: true,
          validation: {
            pattern: '^TKT-[0-9]{6}$',
            minLength: 10,
            maxLength: 10,
          },
          displayOrder: 1,
          defaultValue: '',
        },
        {
          id: 'priority-001',
          name: 'priority',
          type: 'enum',
          description: 'Ticket priority level',
          required: true,
          validation: {
            options: [
              {
                value: 'low',
                label: 'Low Priority',
                description: 'Non-urgent issues',
              },
              {
                value: 'medium',
                label: 'Medium Priority',
                description: 'Standard issues',
              },
              {
                value: 'high',
                label: 'High Priority',
                description: 'Urgent issues',
              },
              {
                value: 'critical',
                label: 'Critical',
                description: 'System down or security issues',
              },
            ],
          },
          displayOrder: 2,
          defaultValue: 'medium',
        },
        {
          id: 'category-001',
          name: 'category',
          type: 'enum',
          description: 'Support category',
          required: true,
          validation: {
            options: [
              { value: 'technical', label: 'Technical Issue' },
              { value: 'billing', label: 'Billing Question' },
              { value: 'feature', label: 'Feature Request' },
              { value: 'account', label: 'Account Management' },
              { value: 'integration', label: 'Integration Support' },
            ],
          },
          displayOrder: 3,
          defaultValue: 'technical',
        },
        {
          id: 'customer-info-001',
          name: 'customerInfo',
          type: 'object',
          description: 'Customer information object',
          required: true,
          validation: {
            required: ['name', 'email'],
          },
          displayOrder: 4,
          defaultValue: {
            name: '',
            email: '',
            tier: 'basic',
          },
        },
        {
          id: 'auto-resolve-001',
          name: 'enableAutoResolve',
          type: 'boolean',
          description: 'Enable automatic resolution for simple issues',
          required: false,
          validation: {},
          displayOrder: 5,
          defaultValue: true,
        },
      ],
      workflowData: {
        blocks: [
          {
            id: 'start-block',
            type: 'starter',
            name: 'Ticket Received',
            position: { x: 0, y: 0 },
            data: {
              message: 'Support ticket received and being processed...',
            },
            isParameterized: true,
            parameterBindings: [
              {
                parameterId: 'ticketId',
                propertyPath: 'data.ticketId',
                bindingType: 'direct',
              },
            ],
            dynamicProperties: [],
          },
          {
            id: 'categorize-block',
            type: 'agent',
            name: 'Categorize Issue',
            position: { x: 200, y: 0 },
            data: {
              prompt: 'Analyze the support ticket and categorize the issue type.',
              agentType: 'classifier',
            },
            isParameterized: true,
            parameterBindings: [
              {
                parameterId: 'category',
                propertyPath: 'data.expectedCategory',
                bindingType: 'direct',
              },
            ],
            dynamicProperties: [
              {
                propertyPath: 'data.prompt',
                valueSource: {
                  type: 'computed',
                  computationRule: {
                    type: 'template',
                    expression: 'Categorize this {{priority}} priority ticket: {{ticketId}}',
                    dependencies: ['priority', 'ticketId'],
                    cacheability: 'session',
                  },
                },
                caching: {
                  scope: 'session',
                  duration: 300,
                  invalidationRules: [],
                  compressionEnabled: false,
                },
              },
            ],
          },
          {
            id: 'route-block',
            type: 'decision',
            name: 'Route Ticket',
            position: { x: 400, y: 0 },
            data: {
              decisionType: 'switch',
              conditions: [
                {
                  operator: 'eq',
                  operands: [
                    {
                      type: 'parameter',
                      parameterId: 'priority',
                      value: 'critical',
                    },
                    { type: 'constant', value: 'critical' },
                  ],
                },
                {
                  operator: 'eq',
                  operands: [
                    {
                      type: 'parameter',
                      parameterId: 'category',
                      value: 'billing',
                    },
                    { type: 'constant', value: 'billing' },
                  ],
                },
              ],
            },
            isParameterized: true,
            parameterBindings: [],
            dynamicProperties: [],
          },
        ],
        edges: [
          {
            id: 'edge-start-categorize',
            sourceBlockId: 'start-block',
            targetBlockId: 'categorize-block',
            sourceHandle: 'output',
            targetHandle: 'input',
          },
          {
            id: 'edge-categorize-route',
            sourceBlockId: 'categorize-block',
            targetBlockId: 'route-block',
            sourceHandle: 'output',
            targetHandle: 'input',
            conditionalConnection: {
              operator: 'eq',
              operands: [
                {
                  type: 'parameter',
                  parameterId: 'enableAutoResolve',
                  value: true,
                },
                { type: 'constant', value: true },
              ],
            },
          },
        ],
        variables: {
          ticketStatus: 'open',
          assignedAgent: null,
          resolutionTime: null,
        },
        parameterMappings: [
          {
            parameterId: 'ticketId',
            targetPath: 'variables.currentTicket',
            transformation: { type: 'direct' },
          },
          {
            parameterId: 'customerInfo',
            targetPath: 'variables.customer',
            transformation: { type: 'direct' },
          },
        ],
        conditionalBlocks: [
          {
            conditionId: 'critical-priority',
            condition: {
              operator: 'eq',
              operands: [
                {
                  type: 'parameter',
                  parameterId: 'priority',
                  value: 'critical',
                },
                { type: 'constant', value: 'critical' },
              ],
            },
            blocksToShow: ['escalate-block'],
            blocksToHide: [],
            edgesToActivate: ['edge-to-escalation'],
            edgesToDeactivate: [],
          },
        ],
        dynamicContent: [],
        optimizationHints: [
          {
            type: 'performance',
            description: 'Cache customer lookup results',
            impact: 'medium',
            implementation: 'cache_customer_data',
          },
          {
            type: 'user_experience',
            description: 'Show progress indicator for long operations',
            impact: 'high',
            implementation: 'add_progress_indicators',
          },
        ],
        performanceSettings: {
          enableCaching: true,
          cacheStrategy: {
            scope: 'user',
            duration: 1800, // 30 minutes
            invalidationRules: [
              {
                trigger: 'parameter_change',
                parameters: ['ticketId', 'priority'],
              },
            ],
            compressionEnabled: true,
          },
          prefetchParameters: true,
          optimizeRendering: true,
          lazyLoadBlocks: false,
          compressionLevel: 'basic',
        },
      },
      isPublic: false,
    }

    const template = await templateLibrary.createTemplate(templateData, 'acme-corp', 'user-789')

    console.log('✅ Template created successfully!')
    console.log(`   Template ID: ${template.id}`)
    console.log(`   Name: ${template.name}`)
    console.log(`   Parameters: ${template.parameters.length}`)
    console.log(`   Category: ${template.category}`)
    console.log(`   Difficulty: ${template.difficulty}`)

    return template
  } catch (error) {
    console.error('❌ Error creating template:', error)
    return null
  }
}

// ============================================================================
// Example 3: Template Search and Discovery
// ============================================================================

async function searchAndDiscovery() {
  console.log('\n=== Template Search and Discovery ===')

  const templateLibrary = new TemplateLibrary()

  try {
    // Search for support-related templates
    const searchResults = await templateLibrary.searchTemplates(
      {
        category: 'customer-support',
        tags: ['automation', 'tickets'],
        difficulty: 'intermediate',
        rating: 4.0,
        isPublic: true,
        query: 'support ticket',
      },
      'acme-corp',
      'user-789'
    )

    console.log('🔍 Search Results:')
    console.log(`   Found ${searchResults.totalCount} templates`)

    searchResults.templates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name}`)
      console.log(`      Category: ${template.category}`)
      console.log(`      Rating: ${template.averageRating}/5.0`)
      console.log(`      Usage: ${template.usageCount} times`)
      console.log(`      Tags: ${template.tags.join(', ')}`)
    })

    // Show facets
    if (searchResults.facets.categories.length > 0) {
      console.log('\n   📊 Categories:')
      searchResults.facets.categories.forEach((facet) => {
        console.log(`      ${facet.category}: ${facet.count} templates`)
      })
    }

    // Get recommendations
    const recommendations = await templateLibrary.getRecommendations('user-789', 'acme-corp', {
      recentActivity: ['customer-support', 'ticket-handling'],
      preferences: { difficulty: 'intermediate' },
      workflowTypes: ['support', 'automation'],
    })

    if (recommendations.length > 0) {
      console.log('\n   💡 Recommended Templates:')
      recommendations.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.category})`)
      })
    }
  } catch (error) {
    console.error('❌ Error during search:', error)
  }
}

// ============================================================================
// Example 4: Template Analytics
// ============================================================================

async function templateAnalytics() {
  console.log('\n=== Template Analytics ===')

  const templateLibrary = new TemplateLibrary()

  try {
    // Get analytics for the customer onboarding template
    const analytics = await templateLibrary.getTemplateAnalytics('customer-onboarding', 'acme-corp')

    console.log('📈 Template Analytics:')
    console.log(`   Total Usage: ${analytics.totalUsage}`)
    console.log(`   Unique Users: ${analytics.uniqueUsers}`)
    console.log(`   Average Rating: ${analytics.averageRating}/5.0`)
    console.log(`   Completion Rate: ${analytics.completionRate}%`)
    console.log(`   Average Generation Time: ${analytics.averageGenerationTime}ms`)
    console.log(`   Journeys Generated: ${analytics.journeysGenerated}`)
    console.log(
      `   Success Rate: ${((analytics.successfulConversions / analytics.journeysGenerated) * 100).toFixed(1)}%`
    )

    if (analytics.parameterUsageStats.length > 0) {
      console.log('\n   📊 Parameter Usage:')
      analytics.parameterUsageStats.forEach((stat) => {
        console.log(`      ${stat.parameterName}:`)
        console.log(`         Used ${stat.usageCount} times`)
        console.log(`         ${stat.uniqueValues} unique values`)
        if (stat.mostCommonValues.length > 0) {
          console.log(
            `         Most common: ${stat.mostCommonValues[0].value} (${stat.mostCommonValues[0].count} times)`
          )
        }
      })
    }

    if (analytics.conversionFailures.length > 0) {
      console.log('\n   ⚠️  Common Issues:')
      analytics.conversionFailures.forEach((failure) => {
        console.log(`      ${failure.errorCode}: ${failure.count} occurrences`)
        console.log(`         Last seen: ${failure.lastOccurrence.toISOString()}`)
      })
    }
  } catch (error) {
    console.error('❌ Error getting analytics:', error)
  }
}

// ============================================================================
// Example 5: Advanced Template Processing
// ============================================================================

async function advancedTemplateProcessing() {
  console.log('\n=== Advanced Template Processing ===')

  const templateEngine = new TemplateEngine()

  try {
    // Get a template (assuming we have one)
    const templateLibrary = new TemplateLibrary()
    const template = await templateLibrary.getTemplate('customer-onboarding', 'acme-corp')

    if (!template) {
      console.log('Template not found')
      return
    }

    // Process the template with complex parameters
    const parameters = {
      customerName: 'Global Tech Solutions',
      companySize: 'large',
      industry: 'technology',
      locations: ['USA', 'Europe', 'Asia'],
      integrations: {
        crm: 'salesforce',
        email: 'outlook',
        calendar: 'google',
      },
      preferences: {
        communicationStyle: 'formal',
        timeZone: 'UTC-8',
        language: 'en-US',
      },
    }

    const result = await templateEngine.processTemplate(template, parameters, {
      contextId: 'advanced-processing-example',
      workspaceId: 'acme-corp',
      userId: 'user-789',
      agentId: 'support-agent-456',
      optimizationLevel: 'aggressive',
      cacheEnabled: true,
      validationEnabled: true,
    })

    console.log('⚙️  Template Processing Results:')
    console.log(`   Processing Time: ${result.processingTime}ms`)
    console.log(`   Validation: ${result.validationResult.isValid ? '✅ Passed' : '❌ Failed'}`)

    if (!result.validationResult.isValid) {
      console.log('   Validation Errors:')
      result.validationResult.errors.forEach((error) => {
        console.log(`      - ${error.message}`)
      })
    }

    if (result.validationResult.warnings.length > 0) {
      console.log('   Warnings:')
      result.validationResult.warnings.forEach((warning) => {
        console.log(`      - ${warning.message}`)
      })
    }

    console.log(`   Applied Parameters: ${Object.keys(result.appliedParameters).length}`)
    console.log(`   Template Version: ${result.metadata.version}`)
  } catch (error) {
    console.error('❌ Error during template processing:', error)
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('🚀 Template System Examples\n')

  await basicJourneyGeneration()
  await createCustomTemplate()
  await searchAndDiscovery()
  await templateAnalytics()
  await advancedTemplateProcessing()

  console.log('\n✨ All examples completed!')
}

// Export examples for use in other files
export {
  basicJourneyGeneration,
  createCustomTemplate,
  searchAndDiscovery,
  templateAnalytics,
  advancedTemplateProcessing,
  runAllExamples,
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error)
}
