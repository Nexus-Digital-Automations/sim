/**
 * Advanced Template Patterns and Use Cases
 * ========================================
 *
 * This file demonstrates advanced patterns for the template system,
 * including inheritance, mixins, conditional logic, dynamic content,
 * and complex parameter validation.
 */

import { TemplateLibrary } from '../library/template-library'
import type {
  ConditionalExpression,
  TemplateMixin,
  ValidationContext,
  ValidationError,
  ValidationResult,
  ValidationWarning,
  WorkflowTemplate,
} from '../types/template-types'

// ============================================================================
// Advanced Pattern 1: Template Inheritance
// ============================================================================

/**
 * Demonstrates how to create a template hierarchy using inheritance
 */
async function demonstrateTemplateInheritance() {
  console.log('=== Template Inheritance Pattern ===')

  const templateLibrary = new TemplateLibrary()

  // Base Support Template
  const baseTemplate: Partial<WorkflowTemplate> = {
    name: 'Base Support Template',
    description: 'Foundation template for all support workflows',
    category: 'customer-support',
    difficulty: 'beginner',
    parameters: [
      {
        id: 'base-001',
        name: 'customerName',
        type: 'string',
        description: 'Customer name for personalization',
        required: true,
        validation: {
          minLength: 2,
          maxLength: 100,
        },
        displayOrder: 1,
        defaultValue: '',
      },
      {
        id: 'base-002',
        name: 'urgency',
        type: 'enum',
        description: 'Request urgency level',
        required: true,
        validation: {
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ],
        },
        displayOrder: 2,
        defaultValue: 'medium',
      },
    ],
    workflowData: {
      blocks: [
        {
          id: 'welcome-block',
          type: 'agent',
          name: 'Welcome Customer',
          position: { x: 0, y: 0 },
          data: {
            prompt: 'Welcome {{customerName}}! How can I help you today?',
          },
          isParameterized: true,
          parameterBindings: [
            {
              parameterId: 'customerName',
              propertyPath: 'data.customerName',
              bindingType: 'direct',
            },
          ],
          dynamicProperties: [],
        },
      ],
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
          duration: 600,
          invalidationRules: [],
          compressionEnabled: false,
        },
        prefetchParameters: false,
        optimizeRendering: true,
        lazyLoadBlocks: false,
        compressionLevel: 'basic',
      },
    },
    tags: ['support', 'base'],
    isPublic: true,
  }

  const baseTemplateResult = await templateLibrary.createTemplate(
    baseTemplate,
    'demo-workspace',
    'system'
  )

  console.log('✅ Base template created:', baseTemplateResult.name)

  // Technical Support Template (inherits from base)
  const technicalTemplate: Partial<WorkflowTemplate> = {
    name: 'Technical Support Template',
    description: 'Specialized template for technical support issues',
    parentTemplateId: baseTemplateResult.id,
    difficulty: 'intermediate',
    parameters: [
      {
        id: 'tech-001',
        name: 'issueType',
        type: 'enum',
        description: 'Type of technical issue',
        required: true,
        validation: {
          options: [
            { value: 'bug', label: 'Bug Report' },
            { value: 'feature', label: 'Feature Request' },
            { value: 'integration', label: 'Integration Issue' },
            { value: 'performance', label: 'Performance Problem' },
          ],
        },
        displayOrder: 3,
        defaultValue: 'bug',
      },
      {
        id: 'tech-002',
        name: 'technicalLevel',
        type: 'enum',
        description: 'Customer technical expertise level',
        required: true,
        validation: {
          options: [
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ],
        },
        displayOrder: 4,
        defaultValue: 'intermediate',
      },
    ],
    overrides: {
      parameters: [
        {
          parameterId: 'base-002', // Override urgency parameter
          operation: 'update',
          newValue: {
            defaultValue: 'high', // Technical issues default to high urgency
            validation: {
              options: [
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical - System Down' },
              ],
            },
          },
        },
      ],
      blocks: [
        {
          blockId: 'welcome-block',
          operation: 'update',
          newValue: {
            data: {
              prompt:
                "Hello {{customerName}}! I'm here to help with your technical issue. What seems to be the problem?",
            },
          },
        },
      ],
      edges: [],
      metadata: {
        description: 'Enhanced for technical support scenarios',
        tags: ['support', 'technical', 'inherited'],
      },
    },
    tags: ['technical', 'support', 'advanced'],
  }

  const technicalTemplateResult = await templateLibrary.createTemplate(
    technicalTemplate,
    'demo-workspace',
    'system'
  )

  console.log('✅ Technical template created:', technicalTemplateResult.name)
  console.log(`   Inherits from: ${technicalTemplateResult.parentTemplateId}`)
  console.log(`   Total parameters: ${technicalTemplateResult.parameters.length}`)
}

// ============================================================================
// Advanced Pattern 2: Template Mixins
// ============================================================================

/**
 * Demonstrates how to use mixins to add reusable functionality
 */
async function demonstrateTemplateMixins() {
  console.log('\n=== Template Mixins Pattern ===')

  // Define a customer satisfaction mixin
  const satisfactionMixin: TemplateMixin = {
    id: 'customer-satisfaction-mixin',
    name: 'Customer Satisfaction Survey',
    description: 'Adds customer satisfaction survey capabilities to any template',
    parametersToAdd: [
      {
        id: 'satisfaction-001',
        name: 'collectSatisfaction',
        type: 'boolean',
        description: 'Whether to collect customer satisfaction feedback',
        required: false,
        validation: {},
        displayOrder: 100,
        defaultValue: true,
      },
      {
        id: 'satisfaction-002',
        name: 'satisfactionTrigger',
        type: 'enum',
        description: 'When to trigger satisfaction survey',
        required: false,
        validation: {
          options: [
            { value: 'completion', label: 'At completion' },
            { value: 'resolution', label: 'When issue resolved' },
            { value: 'follow-up', label: 'In follow-up' },
          ],
        },
        displayOrder: 101,
        defaultValue: 'completion',
      },
    ],
    blocksToAdd: [
      {
        id: 'satisfaction-survey-block',
        type: 'agent',
        name: 'Customer Satisfaction Survey',
        position: { x: 600, y: 0 },
        data: {
          prompt: 'On a scale of 1-5, how satisfied are you with the support you received?',
          responseType: 'rating',
          scale: { min: 1, max: 5 },
        },
        isParameterized: true,
        parameterBindings: [
          {
            parameterId: 'collectSatisfaction',
            propertyPath: 'enabled',
            bindingType: 'direct',
          },
        ],
        conditionalVisibility: {
          operator: 'eq',
          operands: [
            { type: 'parameter', parameterId: 'collectSatisfaction', value: true },
            { type: 'constant', value: true },
          ],
        },
        dynamicProperties: [],
      },
    ],
    edgesToAdd: [],
    transformations: [
      {
        type: 'block_modification',
        targetId: 'final-block',
        rule: {
          type: 'computed',
          expression: 'Add satisfaction survey before completion',
        },
      },
    ],
  }

  // Define an escalation mixin
  const escalationMixin: TemplateMixin = {
    id: 'escalation-mixin',
    name: 'Issue Escalation',
    description: 'Adds escalation capabilities for unresolved issues',
    parametersToAdd: [
      {
        id: 'escalation-001',
        name: 'enableEscalation',
        type: 'boolean',
        description: 'Enable automatic escalation for complex issues',
        required: false,
        validation: {},
        displayOrder: 90,
        defaultValue: true,
      },
      {
        id: 'escalation-002',
        name: 'escalationThreshold',
        type: 'number',
        description: 'Time threshold (minutes) before escalation',
        required: false,
        validation: {
          min: 5,
          max: 120,
        },
        displayOrder: 91,
        defaultValue: 30,
      },
    ],
    blocksToAdd: [
      {
        id: 'escalation-block',
        type: 'decision',
        name: 'Escalation Decision',
        position: { x: 400, y: 200 },
        data: {
          decisionType: 'condition',
          condition: {
            operator: 'and',
            operands: [
              {
                type: 'parameter',
                parameterId: 'enableEscalation',
                value: true,
              },
              {
                type: 'computed',
                value: null,
                computationRule: {
                  type: 'javascript',
                  expression: 'currentTime - startTime > escalationThreshold * 60000',
                  dependencies: ['escalationThreshold'],
                  cacheability: 'dynamic',
                },
              },
            ],
          },
        },
        isParameterized: true,
        parameterBindings: [
          {
            parameterId: 'escalationThreshold',
            propertyPath: 'data.threshold',
            bindingType: 'direct',
          },
        ],
        dynamicProperties: [],
      },
    ],
    edgesToAdd: [],
    transformations: [],
  }

  console.log('✅ Defined mixins:')
  console.log(`   - ${satisfactionMixin.name}`)
  console.log(`   - ${escalationMixin.name}`)

  // Create a template that uses both mixins
  const enhancedTemplate: Partial<WorkflowTemplate> = {
    name: 'Enhanced Support Template',
    description: 'Support template with satisfaction survey and escalation',
    category: 'customer-support',
    difficulty: 'advanced',
    mixins: [satisfactionMixin.id, escalationMixin.id],
    parameters: [
      {
        id: 'enhanced-001',
        name: 'issueDescription',
        type: 'string',
        description: 'Detailed description of the issue',
        required: true,
        validation: {
          minLength: 10,
          maxLength: 1000,
        },
        displayOrder: 1,
        defaultValue: '',
      },
    ],
    tags: ['enhanced', 'support', 'full-featured'],
  }

  console.log('✅ Enhanced template would combine:')
  console.log(`   - Base parameters: 1`)
  console.log(`   - Satisfaction mixin parameters: ${satisfactionMixin.parametersToAdd.length}`)
  console.log(`   - Escalation mixin parameters: ${escalationMixin.parametersToAdd.length}`)
  console.log(
    `   - Total parameters: ${1 + satisfactionMixin.parametersToAdd.length + escalationMixin.parametersToAdd.length}`
  )
}

// ============================================================================
// Advanced Pattern 3: Complex Conditional Logic
// ============================================================================

/**
 * Demonstrates complex conditional expressions and dynamic content
 */
async function demonstrateConditionalLogic() {
  console.log('\n=== Complex Conditional Logic Pattern ===')

  // Define complex conditional expressions
  const priorityBasedRouting: ConditionalExpression = {
    operator: 'or',
    operands: [
      {
        type: 'expression',
        value: null,
        expression: {
          operator: 'and',
          operands: [
            {
              type: 'parameter',
              parameterId: 'priority',
              value: 'critical',
            },
            {
              type: 'constant',
              value: 'critical',
            },
          ],
        },
      },
      {
        type: 'expression',
        value: null,
        expression: {
          operator: 'and',
          operands: [
            {
              type: 'parameter',
              parameterId: 'customerTier',
              value: 'enterprise',
            },
            {
              type: 'constant',
              value: 'enterprise',
            },
            {
              type: 'parameter',
              parameterId: 'issueImpact',
              value: 'high',
            },
            {
              type: 'constant',
              value: 'high',
            },
          ],
        },
      },
    ],
  }

  const timeBasedEscalation: ConditionalExpression = {
    operator: 'and',
    operands: [
      {
        type: 'computed',
        value: null,
        computationRule: {
          type: 'javascript',
          expression: 'new Date().getHours() >= 17 || new Date().getHours() < 9',
          dependencies: [],
          cacheability: 'dynamic',
          timeout: 1000,
        },
      },
      {
        type: 'parameter',
        parameterId: 'requiresImmediateAttention',
        value: true,
      },
    ],
  }

  // Template with complex conditionals
  const smartRoutingTemplate: Partial<WorkflowTemplate> = {
    name: 'Smart Routing Template',
    description: 'Intelligent ticket routing based on multiple conditions',
    category: 'customer-support',
    difficulty: 'advanced',
    parameters: [
      {
        id: 'smart-001',
        name: 'priority',
        type: 'enum',
        description: 'Issue priority',
        required: true,
        validation: {
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ],
        },
        displayOrder: 1,
        defaultValue: 'medium',
      },
      {
        id: 'smart-002',
        name: 'customerTier',
        type: 'enum',
        description: 'Customer subscription tier',
        required: true,
        validation: {
          options: [
            { value: 'basic', label: 'Basic' },
            { value: 'professional', label: 'Professional' },
            { value: 'enterprise', label: 'Enterprise' },
          ],
        },
        displayOrder: 2,
        defaultValue: 'basic',
      },
      {
        id: 'smart-003',
        name: 'issueImpact',
        type: 'enum',
        description: 'Business impact of the issue',
        required: true,
        validation: {
          options: [
            { value: 'low', label: 'Low Impact' },
            { value: 'medium', label: 'Medium Impact' },
            { value: 'high', label: 'High Impact' },
          ],
        },
        displayOrder: 3,
        defaultValue: 'medium',
      },
    ],
    workflowData: {
      blocks: [],
      edges: [],
      variables: {},
      parameterMappings: [],
      conditionalBlocks: [
        {
          conditionId: 'priority-routing',
          condition: priorityBasedRouting,
          blocksToShow: ['specialist-agent-block'],
          blocksToHide: ['general-agent-block'],
          edgesToActivate: ['priority-escalation-edge'],
          edgesToDeactivate: ['standard-routing-edge'],
        },
        {
          conditionId: 'after-hours-escalation',
          condition: timeBasedEscalation,
          blocksToShow: ['after-hours-escalation-block'],
          blocksToHide: [],
          edgesToActivate: ['after-hours-edge'],
          edgesToDeactivate: [],
        },
      ],
      dynamicContent: [
        {
          id: 'personalized-response',
          name: 'Personalized Response Generator',
          type: 'computed',
          source: {
            type: 'computed',
            computationRule: {
              type: 'template',
              expression: `
                {% if priority == 'critical' %}
                  This is a critical issue. We're assigning our best specialist immediately.
                {% elif customerTier == 'enterprise' %}
                  As an enterprise customer, you'll receive priority handling.
                {% else %}
                  We'll process your {{priority}} priority {{issueType}} request promptly.
                {% endif %}
              `,
              dependencies: ['priority', 'customerTier', 'issueType'],
              cacheability: 'session',
            },
          },
          template: {
            blockTemplate: {
              id: 'dynamic-response-block',
              type: 'agent',
              name: 'Dynamic Response',
              position: { x: 200, y: 100 },
              data: {
                prompt: '{{generatedResponse}}',
              },
              isParameterized: true,
              parameterBindings: [],
              dynamicProperties: [
                {
                  propertyPath: 'data.prompt',
                  valueSource: {
                    type: 'computed',
                    computationRule: {
                      type: 'builtin',
                      expression: 'personalized-response',
                      dependencies: [],
                      cacheability: 'session',
                    },
                  },
                  caching: {
                    scope: 'session',
                    duration: 300,
                    invalidationRules: [
                      {
                        trigger: 'parameter_change',
                        parameters: ['priority', 'customerTier'],
                      },
                    ],
                    compressionEnabled: false,
                  },
                },
              ],
            },
            edgeTemplates: [],
            parameterBindings: [],
          },
        },
      ],
      optimizationHints: [
        {
          type: 'performance',
          description: 'Cache conditional evaluations',
          impact: 'medium',
          implementation: 'cache_conditional_results',
        },
        {
          type: 'user_experience',
          description: 'Pre-evaluate likely conditions',
          impact: 'high',
          implementation: 'precompute_conditions',
        },
      ],
      performanceSettings: {
        enableCaching: true,
        cacheStrategy: {
          scope: 'session',
          duration: 900,
          invalidationRules: [
            {
              trigger: 'parameter_change',
              parameters: ['priority', 'customerTier', 'issueImpact'],
            },
            {
              trigger: 'time_based',
              timeInterval: 300, // Re-evaluate time-based conditions every 5 minutes
            },
          ],
          compressionEnabled: true,
        },
        prefetchParameters: true,
        optimizeRendering: true,
        lazyLoadBlocks: true,
        compressionLevel: 'aggressive',
      },
    },
    tags: ['smart', 'conditional', 'routing', 'advanced'],
  }

  console.log('✅ Smart routing template features:')
  console.log(`   - Complex conditional routing`)
  console.log(`   - Time-based escalation`)
  console.log(`   - Dynamic content generation`)
  console.log(`   - Performance optimizations`)
  console.log(`   - Cache invalidation rules`)
}

// ============================================================================
// Advanced Pattern 4: Custom Parameter Validation
// ============================================================================

/**
 * Demonstrates custom parameter validation functions
 */
async function demonstrateCustomValidation() {
  console.log('\n=== Custom Parameter Validation Pattern ===')

  // Custom validation function for business hours
  const businessHoursValidator = (value: any, context: ValidationContext): ValidationResult => {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (typeof value !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Business hours must be a string',
      })
      return { isValid: false, errors, warnings }
    }

    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timePattern.test(value)) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: 'Business hours must be in format HH:MM-HH:MM (e.g., 09:00-17:00)',
      })
      return { isValid: false, errors, warnings }
    }

    const [startTime, endTime] = value.split('-')
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes >= endMinutes) {
      errors.push({
        code: 'INVALID_RANGE',
        message: 'Start time must be before end time',
      })
    }

    if (endMinutes - startMinutes > 12 * 60) {
      warnings.push({
        code: 'LONG_HOURS',
        message: 'Business hours longer than 12 hours may affect response times',
        suggestion: 'Consider splitting into multiple shifts',
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  // Custom validation for email domain restrictions
  const domainRestrictedEmailValidator = (
    value: any,
    context: ValidationContext
  ): ValidationResult => {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (typeof value !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Email must be a string',
      })
      return { isValid: false, errors, warnings }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(value)) {
      errors.push({
        code: 'INVALID_EMAIL',
        message: 'Invalid email format',
      })
      return { isValid: false, errors, warnings }
    }

    const domain = value.split('@')[1].toLowerCase()
    const allowedDomains = ['company.com', 'enterprise.com', 'business.net']
    const blockedDomains = ['spam.com', 'blocked.net']

    if (blockedDomains.includes(domain)) {
      errors.push({
        code: 'BLOCKED_DOMAIN',
        message: `Email domain ${domain} is not allowed`,
      })
    } else if (!allowedDomains.includes(domain)) {
      warnings.push({
        code: 'EXTERNAL_DOMAIN',
        message: `External email domain detected: ${domain}`,
        suggestion: 'Verify this is a legitimate business contact',
      })
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  // Template with custom validations
  const customValidationTemplate: Partial<WorkflowTemplate> = {
    name: 'Custom Validation Template',
    description: 'Demonstrates custom parameter validation functions',
    category: 'demo',
    difficulty: 'advanced',
    parameters: [
      {
        id: 'custom-001',
        name: 'businessHours',
        type: 'string',
        description: 'Business operating hours',
        required: true,
        validation: {
          customValidator: businessHoursValidator,
        },
        displayOrder: 1,
        defaultValue: '09:00-17:00',
      },
      {
        id: 'custom-002',
        name: 'contactEmail',
        type: 'string',
        description: 'Primary contact email address',
        required: true,
        validation: {
          customValidator: domainRestrictedEmailValidator,
        },
        displayOrder: 2,
        defaultValue: '',
      },
      {
        id: 'custom-003',
        name: 'configuration',
        type: 'object',
        description: 'Complex configuration object',
        required: true,
        validation: {
          required: ['timeout', 'endpoints'],
          additionalProperties: false,
        },
        displayOrder: 3,
        defaultValue: {
          timeout: 30000,
          retries: 3,
          endpoints: ['https://api.example.com'],
          features: {
            caching: true,
            compression: false,
            encryption: true,
          },
        },
      },
    ],
    tags: ['validation', 'custom', 'advanced', 'demo'],
  }

  console.log('✅ Custom validation template features:')
  console.log(`   - Business hours format validation`)
  console.log(`   - Domain-restricted email validation`)
  console.log(`   - Complex object schema validation`)
  console.log(`   - Custom error messages and warnings`)
}

// ============================================================================
// Run Advanced Examples
// ============================================================================

async function runAdvancedExamples() {
  console.log('🚀 Advanced Template Pattern Examples\n')

  await demonstrateTemplateInheritance()
  await demonstrateTemplateMixins()
  await demonstrateConditionalLogic()
  await demonstrateCustomValidation()

  console.log('\n✨ All advanced examples completed!')
}

// Export examples
export {
  demonstrateTemplateInheritance,
  demonstrateTemplateMixins,
  demonstrateConditionalLogic,
  demonstrateCustomValidation,
  runAdvancedExamples,
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAdvancedExamples().catch(console.error)
}
