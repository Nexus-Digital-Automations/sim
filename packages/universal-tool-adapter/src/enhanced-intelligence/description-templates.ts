/**
 * Standardized Description Templates for Universal Tool Adapter
 *
 * Comprehensive collection of standardized templates for generating consistent,
 * high-quality natural language descriptions across all tool categories.
 * These templates support multi-level descriptions, contextual adaptation,
 * and user personalization.
 *
 * @author Natural Language Description Framework Agent
 * @version 2.0.0
 */

import type {
  EnhancedDescriptionSchema,
  ToolCategory,
  UserRole,
  SkillLevel,
  BriefDescription,
  DetailedDescription,
  ExpertDescription
} from './natural-language-description-framework'

// =============================================================================
// Template Schema Types
// =============================================================================

/**
 * Enhanced template structure for generating multi-level descriptions
 */
export interface EnhancedDescriptionTemplate {
  // Template metadata
  templateId: string
  templateName: string
  category: ToolCategory
  version: string

  // Multi-level templates
  briefTemplate: BriefDescriptionTemplate
  detailedTemplate: DetailedDescriptionTemplate
  expertTemplate: ExpertDescriptionTemplate

  // Contextual adaptation templates
  roleTemplates: Record<UserRole, RoleSpecificTemplate>
  skillTemplates: Record<SkillLevel, SkillSpecificTemplate>

  // Usage templates
  usagePatterns: UsagePatternTemplate[]
  conversationalTemplates: ConversationalTemplate[]

  // Quality and validation
  validationRules: TemplateValidationRule[]
  qualityMetrics: TemplateQualityMetric[]

  // Customization options
  customizationPoints: CustomizationPoint[]
  extensionMechanisms: TemplateExtension[]
}

export interface BriefDescriptionTemplate {
  summaryPattern: string
  useCasePattern: string
  capabilityPattern: string
  complexityIndicators: ComplexityIndicator[]
  tagGenerationRules: TagRule[]
}

export interface DetailedDescriptionTemplate {
  overviewPattern: string
  functionalityPattern: string
  useCaseTemplates: UseCaseTemplate[]
  benefitsPattern: string[]
  limitationsPattern: string[]
  integrationPattern: string
}

export interface ExpertDescriptionTemplate {
  architecturePattern: string
  configurationTemplates: ConfigurationTemplate[]
  performanceTemplates: PerformanceTemplate[]
  securityTemplates: SecurityTemplate[]
  troubleshootingTemplates: TroubleshootingTemplate[]
  extensibilityPattern: string
}

export interface RoleSpecificTemplate {
  role: UserRole
  perspectiveAdjustments: PerspectiveAdjustment[]
  relevanceFilters: RelevanceFilter[]
  benefitsEmphasis: string[]
  challengesAwareness: string[]
  recommendedApproachPattern: string
}

export interface SkillSpecificTemplate {
  skillLevel: SkillLevel
  complexityAdjustment: ComplexityAdjustment
  prerequisiteTemplates: PrerequisiteTemplate[]
  guidanceIntensity: GuidanceIntensity
  confidenceBuilders: ConfidenceBuilder[]
}

export interface UsagePatternTemplate {
  patternId: string
  scenario: string
  contextTriggers: string[]
  instructionPattern: string
  expectedOutcomePattern: string
  variationPoints: VariationPoint[]
}

export interface ConversationalTemplate {
  intent: string
  triggerPhrases: string[]
  responsePattern: string
  followUpSuggestions: string[]
  clarificationQuestions: string[]
}

// Supporting types
export interface ComplexityIndicator { metric: string; threshold: any; indication: 'simple' | 'moderate' | 'complex' }
export interface TagRule { condition: string; tags: string[] }
export interface UseCaseTemplate { scenario: string; pattern: string; difficulty: SkillLevel }
export interface ConfigurationTemplate { aspect: string; pattern: string; examples: string[] }
export interface PerformanceTemplate { metric: string; pattern: string; benchmarks: Record<string, number> }
export interface SecurityTemplate { aspect: string; pattern: string; compliance: string[] }
export interface TroubleshootingTemplate { category: string; pattern: string; escalation: string }
export interface PerspectiveAdjustment { aspect: string; adjustment: string }
export interface RelevanceFilter { criterion: string; weight: number }
export interface ComplexityAdjustment { factor: number; simplifications: string[] }
export interface PrerequisiteTemplate { type: string; pattern: string }
export interface GuidanceIntensity { level: 'minimal' | 'moderate' | 'intensive'; patterns: string[] }
export interface ConfidenceBuilder { technique: string; application: string }
export interface VariationPoint { parameter: string; variations: string[] }
export interface TemplateValidationRule { rule: string; severity: 'warning' | 'error' }
export interface TemplateQualityMetric { metric: string; target: number }
export interface CustomizationPoint { point: string; options: string[] }
export interface TemplateExtension { extensionType: string; mechanism: string }

// =============================================================================
// Communication Tools Templates
// =============================================================================

export const COMMUNICATION_TEMPLATES: EnhancedDescriptionTemplate = {
  templateId: 'communication-v2',
  templateName: 'Communication Tools Template',
  category: 'communication',
  version: '2.0.0',

  briefTemplate: {
    summaryPattern: 'Connect and communicate with {recipients} through {platform} using {primaryMethod}',
    useCasePattern: 'Send {messageType} to {targetAudience} for {purpose}',
    capabilityPattern: 'Automated {communicationType} with {features}',
    complexityIndicators: [
      { metric: 'recipientCount', threshold: 1, indication: 'simple' },
      { metric: 'recipientCount', threshold: 10, indication: 'moderate' },
      { metric: 'recipientCount', threshold: 100, indication: 'complex' }
    ],
    tagGenerationRules: [
      { condition: 'email', tags: ['email', 'communication', 'messaging'] },
      { condition: 'slack', tags: ['slack', 'team-chat', 'collaboration'] },
      { condition: 'sms', tags: ['sms', 'mobile', 'instant'] }
    ]
  },

  detailedTemplate: {
    overviewPattern: 'Streamline your communication workflow with {platform}, enabling seamless {communicationType} across {channels}. Perfect for {primaryAudience} who need to {mainGoal}.',
    functionalityPattern: 'Core capabilities include {features}, supporting {workflows} with {integrations}',
    useCaseTemplates: [
      { scenario: 'team-coordination', pattern: 'Coordinate {teamType} activities through {communicationMethod}', difficulty: 'beginner' },
      { scenario: 'customer-outreach', pattern: 'Reach customers with {messageType} for {campaignType}', difficulty: 'intermediate' },
      { scenario: 'automated-notifications', pattern: 'Set up automated {notificationType} based on {triggers}', difficulty: 'advanced' }
    ],
    benefitsPattern: [
      'Reduce communication overhead by {efficiencyGain}',
      'Maintain consistent messaging across {channels}',
      'Enable {automationLevel} automation for routine communications',
      'Integrate seamlessly with {existingTools}'
    ],
    limitationsPattern: [
      'Requires {platformAccess} access and proper authentication',
      'May have {rateLimits} on message volume',
      'Subject to {platformPolicies} and compliance requirements'
    ],
    integrationPattern: 'Integrates with {ecosystem} through {integrationMethods}, supporting {dataFormats} and {authMethods}'
  },

  expertTemplate: {
    architecturePattern: 'Built on {architecturePattern} architecture with {scalabilityFeatures}, supporting {concurrencyModel} and {reliabilityMechanisms}',
    configurationTemplates: [
      { aspect: 'authentication', pattern: 'Configure {authMethod} with {credentials} and {scopes}', examples: ['OAuth 2.0', 'API Keys', 'Service Accounts'] },
      { aspect: 'rate-limiting', pattern: 'Implement {rateLimitStrategy} with {limits} and {backoffStrategy}', examples: ['Token bucket', 'Fixed window', 'Sliding window'] }
    ],
    performanceTemplates: [
      { metric: 'throughput', pattern: 'Supports up to {messagesPerSecond} messages per second', benchmarks: { email: 100, slack: 1000, sms: 50 } },
      { metric: 'latency', pattern: 'Average delivery time of {averageLatency}ms', benchmarks: { email: 2000, slack: 100, sms: 500 } }
    ],
    securityTemplates: [
      { aspect: 'encryption', pattern: 'Messages encrypted using {encryptionStandard} with {keyManagement}', compliance: ['GDPR', 'SOC 2', 'HIPAA'] },
      { aspect: 'access-control', pattern: 'Role-based access control with {permissionModel}', compliance: ['SOX', 'PCI DSS'] }
    ],
    troubleshootingTemplates: [
      { category: 'authentication', pattern: 'Authentication failures typically caused by {commonCauses}', escalation: 'Check {authEndpoint} status and {credentialValidity}' },
      { category: 'delivery', pattern: 'Message delivery issues often related to {deliveryFactors}', escalation: 'Verify {recipientDetails} and {platformStatus}' }
    ],
    extensibilityPattern: 'Extend functionality through {extensionPoints} supporting {customizationOptions} and {integrationHooks}'
  },

  roleTemplates: {
    'business_user': {
      role: 'business_user',
      perspectiveAdjustments: [
        { aspect: 'complexity', adjustment: 'Focus on business outcomes rather than technical implementation' },
        { aspect: 'workflow', adjustment: 'Emphasize integration with existing business processes' }
      ],
      relevanceFilters: [
        { criterion: 'roi_impact', weight: 0.8 },
        { criterion: 'ease_of_use', weight: 0.9 },
        { criterion: 'business_value', weight: 1.0 }
      ],
      benefitsEmphasis: ['productivity gains', 'cost reduction', 'improved customer relationships'],
      challengesAwareness: ['learning curve', 'change management', 'compliance requirements'],
      recommendedApproachPattern: 'Start with {basicUseCase}, expand to {advancedUseCases} as comfort grows'
    },
    'developer': {
      role: 'developer',
      perspectiveAdjustments: [
        { aspect: 'implementation', adjustment: 'Provide detailed API documentation and code examples' },
        { aspect: 'integration', adjustment: 'Focus on technical integration patterns and best practices' }
      ],
      relevanceFilters: [
        { criterion: 'api_quality', weight: 1.0 },
        { criterion: 'documentation', weight: 0.9 },
        { criterion: 'flexibility', weight: 0.8 }
      ],
      benefitsEmphasis: ['API reliability', 'developer experience', 'customization options'],
      challengesAwareness: ['API rate limits', 'authentication complexity', 'error handling'],
      recommendedApproachPattern: 'Review {apiDocumentation}, implement {basicIntegration}, optimize with {advancedFeatures}'
    },
    'admin': {
      role: 'admin',
      perspectiveAdjustments: [
        { aspect: 'security', adjustment: 'Highlight security features and compliance capabilities' },
        { aspect: 'management', adjustment: 'Emphasize user management and organizational control' }
      ],
      relevanceFilters: [
        { criterion: 'security', weight: 1.0 },
        { criterion: 'scalability', weight: 0.9 },
        { criterion: 'auditability', weight: 0.8 }
      ],
      benefitsEmphasis: ['centralized control', 'security compliance', 'audit capabilities'],
      challengesAwareness: ['user training', 'policy enforcement', 'system integration'],
      recommendedApproachPattern: 'Establish {securityPolicies}, configure {userPermissions}, monitor {usageMetrics}'
    },
    'analyst': {
      role: 'analyst',
      perspectiveAdjustments: [
        { aspect: 'data', adjustment: 'Focus on data insights and analytics capabilities' },
        { aspect: 'metrics', adjustment: 'Highlight measurable outcomes and KPIs' }
      ],
      relevanceFilters: [
        { criterion: 'analytics', weight: 1.0 },
        { criterion: 'reporting', weight: 0.9 },
        { criterion: 'data_quality', weight: 0.8 }
      ],
      benefitsEmphasis: ['data insights', 'performance metrics', 'trend analysis'],
      challengesAwareness: ['data accuracy', 'metric interpretation', 'reporting complexity'],
      recommendedApproachPattern: 'Define {keyMetrics}, establish {reportingCadence}, analyze {performancePatterns}'
    },
    'manager': {
      role: 'manager',
      perspectiveAdjustments: [
        { aspect: 'team_impact', adjustment: 'Emphasize team productivity and collaboration benefits' },
        { aspect: 'oversight', adjustment: 'Highlight management and monitoring capabilities' }
      ],
      relevanceFilters: [
        { criterion: 'team_productivity', weight: 1.0 },
        { criterion: 'visibility', weight: 0.9 },
        { criterion: 'efficiency', weight: 0.8 }
      ],
      benefitsEmphasis: ['team coordination', 'project visibility', 'efficiency gains'],
      challengesAwareness: ['team adoption', 'workflow changes', 'training needs'],
      recommendedApproachPattern: 'Pilot with {smallTeam}, measure {impactMetrics}, scale to {fullOrganization}'
    },
    'researcher': {
      role: 'researcher',
      perspectiveAdjustments: [
        { aspect: 'methodology', adjustment: 'Focus on research applications and data collection' },
        { aspect: 'collaboration', adjustment: 'Emphasize academic and research collaboration features' }
      ],
      relevanceFilters: [
        { criterion: 'research_utility', weight: 1.0 },
        { criterion: 'data_handling', weight: 0.9 },
        { criterion: 'collaboration', weight: 0.8 }
      ],
      benefitsEmphasis: ['research collaboration', 'data collection', 'academic networking'],
      challenglesAwareness: ['data privacy', 'research ethics', 'institutional policies'],
      recommendedApproachPattern: 'Design {researchProtocol}, collect {dataEthically}, collaborate with {academicPeers}'
    },
    'designer': {
      role: 'designer',
      perspectiveAdjustments: [
        { aspect: 'user_experience', adjustment: 'Focus on design and user experience aspects' },
        { aspect: 'workflow', adjustment: 'Emphasize creative workflow integration' }
      ],
      relevanceFilters: [
        { criterion: 'design_integration', weight: 1.0 },
        { criterion: 'user_experience', weight: 0.9 },
        { criterion: 'creative_workflow', weight: 0.8 }
      ],
      benefitsEmphasis: ['design workflow', 'creative collaboration', 'user feedback'],
      challengesAwareness: ['tool learning curve', 'design constraints', 'feedback management'],
      recommendedApproachPattern: 'Integrate with {designTools}, establish {feedbackLoops}, optimize {creativeWorkflow}'
    },
    'qa_tester': {
      role: 'qa_tester',
      perspectiveAdjustments: [
        { aspect: 'testing', adjustment: 'Focus on testing and quality assurance applications' },
        { aspect: 'validation', adjustment: 'Emphasize validation and verification capabilities' }
      ],
      relevanceFilters: [
        { criterion: 'testing_utility', weight: 1.0 },
        { criterion: 'quality_assurance', weight: 0.9 },
        { criterion: 'automation', weight: 0.8 }
      ],
      benefitsEmphasis: ['test automation', 'quality metrics', 'defect tracking'],
      challengesAwareness: ['test coverage', 'false positives', 'integration complexity'],
      recommendedApproachPattern: 'Design {testStrategy}, implement {automatedTests}, track {qualityMetrics}'
    }
  },

  skillTemplates: {
    'beginner': {
      skillLevel: 'beginner',
      complexityAdjustment: { factor: 0.3, simplifications: ['step-by-step guidance', 'visual aids', 'common examples'] },
      prerequisiteTemplates: [
        { type: 'knowledge', pattern: 'Basic understanding of {fundamentalConcept}' },
        { type: 'access', pattern: 'Valid {platform} account with {permissions}' }
      ],
      guidanceIntensity: {
        level: 'intensive',
        patterns: ['Detailed explanations for each step', 'Common pitfalls and how to avoid them', 'Clear success indicators']
      },
      confidenceBuilders: [
        { technique: 'quick_wins', application: 'Start with simple tasks that provide immediate value' },
        { technique: 'progressive_disclosure', application: 'Introduce complexity gradually as skills develop' }
      ]
    },
    'intermediate': {
      skillLevel: 'intermediate',
      complexityAdjustment: { factor: 0.7, simplifications: ['focused examples', 'best practices', 'common patterns'] },
      prerequisiteTemplates: [
        { type: 'experience', pattern: 'Previous experience with {similarTools}' },
        { type: 'concepts', pattern: 'Understanding of {intermediateConcepts}' }
      ],
      guidanceIntensity: {
        level: 'moderate',
        patterns: ['Key principles and patterns', 'Optimization opportunities', 'Integration considerations']
      },
      confidenceBuilders: [
        { technique: 'skill_building', application: 'Challenges that extend current capabilities' },
        { technique: 'peer_learning', application: 'Examples from similar skill level users' }
      ]
    },
    'advanced': {
      skillLevel: 'advanced',
      complexityAdjustment: { factor: 0.9, simplifications: ['architectural patterns', 'optimization techniques', 'edge cases'] },
      prerequisiteTemplates: [
        { type: 'expertise', pattern: 'Deep expertise in {domainArea}' },
        { type: 'systems', pattern: 'Understanding of {systemArchitecture}' }
      ],
      guidanceIntensity: {
        level: 'minimal',
        patterns: ['Architecture considerations', 'Performance optimization', 'Advanced integration patterns']
      },
      confidenceBuilders: [
        { technique: 'innovation', application: 'Novel applications and customizations' },
        { technique: 'leadership', application: 'Examples of leading best practices' }
      ]
    },
    'expert': {
      skillLevel: 'expert',
      complexityAdjustment: { factor: 1.0, simplifications: ['full complexity', 'edge cases', 'extensibility'] },
      prerequisiteTemplates: [
        { type: 'mastery', pattern: 'Master-level understanding of {expertDomain}' },
        { type: 'innovation', pattern: 'Capability to extend and innovate within {field}' }
      ],
      guidanceIntensity: {
        level: 'minimal',
        patterns: ['Technical depth', 'Research opportunities', 'Industry leadership']
      },
      confidenceBuilders: [
        { technique: 'thought_leadership', application: 'Opportunities to contribute to tool evolution' },
        { technique: 'knowledge_sharing', application: 'Platform for sharing advanced techniques' }
      ]
    }
  },

  usagePatterns: [
    {
      patternId: 'simple-message',
      scenario: 'Send a basic message',
      contextTriggers: ['send message', 'communicate with', 'reach out to'],
      instructionPattern: 'Send {messageType} to {recipient} with content: {messageContent}',
      expectedOutcomePattern: 'Message delivered successfully to {recipient}',
      variationPoints: [
        { parameter: 'messageType', variations: ['email', 'slack message', 'SMS', 'notification'] },
        { parameter: 'recipient', variations: ['individual', 'team', 'channel', 'distribution list'] }
      ]
    },
    {
      patternId: 'scheduled-communication',
      scenario: 'Schedule communication for later',
      contextTriggers: ['schedule message', 'send later', 'delayed communication'],
      instructionPattern: 'Schedule {messageType} to {recipient} for {scheduledTime} with content: {messageContent}',
      expectedOutcomePattern: 'Message scheduled and will be sent at {scheduledTime}',
      variationPoints: [
        { parameter: 'scheduledTime', variations: ['specific datetime', 'relative time', 'recurring schedule'] }
      ]
    },
    {
      patternId: 'bulk-communication',
      scenario: 'Send messages to multiple recipients',
      contextTriggers: ['bulk send', 'mass communication', 'broadcast message'],
      instructionPattern: 'Send {messageType} to {recipientList} with personalized content: {templateContent}',
      expectedOutcomePattern: 'Messages sent to {recipientCount} recipients with {successRate} success rate',
      variationPoints: [
        { parameter: 'recipientList', variations: ['CSV file', 'database query', 'predefined list'] },
        { parameter: 'templateContent', variations: ['static message', 'personalized template', 'dynamic content'] }
      ]
    }
  ],

  conversationalTemplates: [
    {
      intent: 'send_message',
      triggerPhrases: ['send email to', 'message', 'reach out to', 'communicate with'],
      responsePattern: 'I can help you send a {messageType} to {recipient}. What would you like to communicate?',
      followUpSuggestions: ['Would you like to schedule this for later?', 'Should I add anyone else to this message?'],
      clarificationQuestions: ['Who should receive this message?', 'What type of message would you like to send?', 'What should the content be?']
    },
    {
      intent: 'schedule_communication',
      triggerPhrases: ['schedule message', 'send later', 'delayed send'],
      responsePattern: 'I can schedule your {messageType} for {scheduledTime}. What content would you like to include?',
      followUpSuggestions: ['Would you like to set up a recurring message?', 'Should I remind you before it sends?'],
      clarificationQuestions: ['When should this be sent?', 'Is this a one-time or recurring message?']
    },
    {
      intent: 'mass_communication',
      triggerPhrases: ['send to everyone', 'bulk message', 'broadcast', 'mass email'],
      responsePattern: 'I can help you send a {messageType} to multiple recipients. How would you like to define your audience?',
      followUpSuggestions: ['Would you like to personalize messages for each recipient?', 'Should I track delivery and engagement?'],
      clarificationQuestions: ['Who should receive these messages?', 'Do you have a template or should I help create one?']
    }
  ],

  validationRules: [
    { rule: 'Template must include authentication requirements', severity: 'error' },
    { rule: 'All role templates should have balanced perspective adjustments', severity: 'warning' },
    { rule: 'Usage patterns must include variation points for flexibility', severity: 'warning' }
  ],

  qualityMetrics: [
    { metric: 'template_completeness', target: 0.95 },
    { metric: 'user_comprehension', target: 0.85 },
    { metric: 'contextual_relevance', target: 0.90 }
  ],

  customizationPoints: [
    { point: 'message_templates', options: ['dynamic substitution', 'conditional content', 'multi-language'] },
    { point: 'delivery_methods', options: ['immediate', 'scheduled', 'triggered'] },
    { point: 'recipient_management', options: ['static lists', 'dynamic queries', 'segmentation'] }
  ],

  extensionMechanisms: [
    { extensionType: 'custom_channels', mechanism: 'Plugin architecture for new communication platforms' },
    { extensionType: 'message_processing', mechanism: 'Hook system for message transformation and validation' },
    { extensionType: 'analytics_integration', mechanism: 'Event system for tracking and analytics' }
  ]
}

// =============================================================================
// Data Storage Tools Templates
// =============================================================================

export const DATA_STORAGE_TEMPLATES: EnhancedDescriptionTemplate = {
  templateId: 'data-storage-v2',
  templateName: 'Data Storage Tools Template',
  category: 'data_storage',
  version: '2.0.0',

  briefTemplate: {
    summaryPattern: 'Store, query, and manage {dataType} in {storageSystem} with {accessPattern}',
    useCasePattern: 'Manage {dataVolume} of {dataType} for {businessPurpose}',
    capabilityPattern: '{storageType} storage with {queryCapabilities} and {scalabilityFeatures}',
    complexityIndicators: [
      { metric: 'dataVolume', threshold: '1GB', indication: 'simple' },
      { metric: 'dataVolume', threshold: '100GB', indication: 'moderate' },
      { metric: 'dataVolume', threshold: '1TB', indication: 'complex' }
    ],
    tagGenerationRules: [
      { condition: 'relational', tags: ['SQL', 'relational', 'ACID'] },
      { condition: 'document', tags: ['NoSQL', 'document', 'JSON'] },
      { condition: 'vector', tags: ['vector', 'embeddings', 'similarity'] }
    ]
  },

  detailedTemplate: {
    overviewPattern: 'Comprehensive data management solution for {storageType} workloads, supporting {dataModels} with {consistencyGuarantees}',
    functionalityPattern: 'Core features include {storageOperations}, {queryCapabilities}, and {managementFeatures}',
    useCaseTemplates: [
      { scenario: 'transactional-data', pattern: 'Handle {transactionVolume} transactions with {consistencyLevel}', difficulty: 'intermediate' },
      { scenario: 'analytics-data', pattern: 'Store and analyze {analyticsDataType} for {businessInsights}', difficulty: 'advanced' },
      { scenario: 'content-storage', pattern: 'Manage {contentType} with {accessPatterns}', difficulty: 'beginner' }
    ],
    benefitsPattern: [
      'Ensure data {consistencyLevel} with {durabilityGuarantees}',
      'Scale to handle {scalabilityTarget} with {performanceCharacteristics}',
      'Provide {queryFlexibility} for diverse access patterns',
      'Integrate with {ecosystemTools} seamlessly'
    ],
    limitationsPattern: [
      'Performance depends on {performanceFactors}',
      'Scaling considerations for {scalingLimitations}',
      'Consistency tradeoffs in {distributedScenarios}'
    ],
    integrationPattern: 'Connect with {dataEcosystem} through {integrationProtocols}'
  },

  expertTemplate: {
    architecturePattern: 'Built on {databaseArchitecture} with {distributionStrategy} and {replicationModel}',
    configurationTemplates: [
      { aspect: 'performance', pattern: 'Optimize for {workloadType} with {performanceTuning}', examples: ['indexing strategies', 'connection pooling', 'caching layers'] },
      { aspect: 'reliability', pattern: 'Configure {backupStrategy} with {recoveryObjectives}', examples: ['point-in-time recovery', 'cross-region replication', 'automated backups'] }
    ],
    performanceTemplates: [
      { metric: 'throughput', pattern: 'Supports {operationsPerSecond} operations per second', benchmarks: { reads: 10000, writes: 5000, queries: 1000 } },
      { metric: 'latency', pattern: 'Average response time of {latencyTarget}ms', benchmarks: { simple_query: 10, complex_query: 100, write_operation: 20 } }
    ],
    securityTemplates: [
      { aspect: 'access_control', pattern: 'Row-level security with {authorizationModel}', compliance: ['SOX', 'GDPR', 'HIPAA'] },
      { aspect: 'encryption', pattern: 'Data encrypted at rest and in transit using {encryptionStandards}', compliance: ['PCI DSS', 'SOC 2'] }
    ],
    troubleshootingTemplates: [
      { category: 'performance', pattern: 'Performance issues typically caused by {performanceBottlenecks}', escalation: 'Check {performanceMetrics} and optimize {performanceAreas}' },
      { category: 'connectivity', pattern: 'Connection problems often related to {connectivityIssues}', escalation: 'Verify {networkConfiguration} and {authenticationSettings}' }
    ],
    extensibilityPattern: 'Extend through {extensionMechanisms} supporting {customOperations}'
  },

  // Skill and role templates would follow similar pattern to communication templates
  // but adapted for data storage context...

  roleTemplates: {} as any, // Simplified for brevity - would contain full role-specific adaptations
  skillTemplates: {} as any, // Simplified for brevity - would contain skill-level adaptations

  usagePatterns: [
    {
      patternId: 'simple-crud',
      scenario: 'Basic data operations',
      contextTriggers: ['create record', 'read data', 'update record', 'delete data'],
      instructionPattern: '{operation} {dataType} in {collection} with {criteria}',
      expectedOutcomePattern: '{operation} completed successfully for {recordCount} records',
      variationPoints: [
        { parameter: 'operation', variations: ['create', 'read', 'update', 'delete'] },
        { parameter: 'dataType', variations: ['user', 'product', 'order', 'document'] }
      ]
    },
    {
      patternId: 'complex-query',
      scenario: 'Advanced data querying',
      contextTriggers: ['find records where', 'query data', 'search for', 'filter by'],
      instructionPattern: 'Query {dataType} where {conditions} with {sorting} and {pagination}',
      expectedOutcomePattern: 'Found {resultCount} records matching criteria in {responseTime}ms',
      variationPoints: [
        { parameter: 'conditions', variations: ['simple equality', 'range queries', 'complex joins'] },
        { parameter: 'sorting', variations: ['single field', 'multiple fields', 'custom order'] }
      ]
    },
    {
      patternId: 'bulk-operations',
      scenario: 'Bulk data operations',
      contextTriggers: ['bulk insert', 'mass update', 'batch delete', 'data migration'],
      instructionPattern: 'Perform bulk {operation} on {dataSet} with {batchSize} and {errorHandling}',
      expectedOutcomePattern: 'Processed {totalRecords} records with {successRate} success rate',
      variationPoints: [
        { parameter: 'batchSize', variations: ['small batches (100)', 'medium batches (1000)', 'large batches (10000)'] },
        { parameter: 'errorHandling', variations: ['fail-fast', 'continue-on-error', 'rollback-on-error'] }
      ]
    }
  ],

  conversationalTemplates: [
    {
      intent: 'store_data',
      triggerPhrases: ['save data', 'store information', 'create record'],
      responsePattern: 'I can help you store {dataType} in {storageLocation}. What information would you like to save?',
      followUpSuggestions: ['Would you like to validate the data before storing?', 'Should I set up automatic backups?'],
      clarificationQuestions: ['What type of data are you storing?', 'Where should this be saved?', 'What format should I use?']
    },
    {
      intent: 'query_data',
      triggerPhrases: ['find data', 'search for', 'query records', 'look up'],
      responsePattern: 'I can help you find {dataType} using {queryMethod}. What criteria should I use?',
      followUpSuggestions: ['Would you like to export the results?', 'Should I set up alerts for similar data?'],
      clarificationQuestions: ['What are you looking for?', 'What conditions should I apply?', 'How should I sort the results?']
    },
    {
      intent: 'manage_data',
      triggerPhrases: ['update data', 'modify records', 'change information'],
      responsePattern: 'I can help you update {dataType} in {storageLocation}. What changes would you like to make?',
      followUpSuggestions: ['Would you like to backup before making changes?', 'Should I validate the updates?'],
      clarificationQuestions: ['Which records should be updated?', 'What changes should I make?', 'Should I create a backup first?']
    }
  ],

  validationRules: [
    { rule: 'Must include data consistency guarantees', severity: 'error' },
    { rule: 'Should specify backup and recovery procedures', severity: 'warning' },
    { rule: 'Must address scalability considerations', severity: 'error' }
  ],

  qualityMetrics: [
    { metric: 'technical_accuracy', target: 0.95 },
    { metric: 'performance_clarity', target: 0.90 },
    { metric: 'security_coverage', target: 0.95 }
  ],

  customizationPoints: [
    { point: 'schema_design', options: ['relational', 'document', 'graph', 'columnar'] },
    { point: 'consistency_model', options: ['strong', 'eventual', 'causal'] },
    { point: 'indexing_strategy', options: ['btree', 'hash', 'full-text', 'vector'] }
  ],

  extensionMechanisms: [
    { extensionType: 'custom_types', mechanism: 'Plugin system for custom data types and validators' },
    { extensionType: 'query_extensions', mechanism: 'Custom query operators and functions' },
    { extensionType: 'storage_engines', mechanism: 'Pluggable storage engines for different use cases' }
  ]
}

// =============================================================================
// AI/ML Tools Templates
// =============================================================================

export const AI_ML_TEMPLATES: EnhancedDescriptionTemplate = {
  templateId: 'ai-ml-v2',
  templateName: 'AI & Machine Learning Tools Template',
  category: 'ai_ml',
  version: '2.0.0',

  briefTemplate: {
    summaryPattern: 'Apply {aiCapability} to {inputType} producing {outputType} with {qualityLevel}',
    useCasePattern: 'Use AI for {applicationDomain} to achieve {businessOutcome}',
    capabilityPattern: '{modelType} model with {inputModalities} and {outputCapabilities}',
    complexityIndicators: [
      { metric: 'modelComplexity', threshold: 'simple', indication: 'simple' },
      { metric: 'modelComplexity', threshold: 'transformer', indication: 'moderate' },
      { metric: 'modelComplexity', threshold: 'multimodal', indication: 'complex' }
    ],
    tagGenerationRules: [
      { condition: 'text', tags: ['NLP', 'text-processing', 'language'] },
      { condition: 'image', tags: ['computer-vision', 'image-processing', 'visual'] },
      { condition: 'audio', tags: ['speech', 'audio-processing', 'sound'] }
    ]
  },

  detailedTemplate: {
    overviewPattern: 'Advanced AI capabilities for {applicationDomain}, leveraging {modelArchitecture} to deliver {businessValue}',
    functionalityPattern: 'Process {inputTypes} through {processingPipeline} to generate {outputTypes}',
    useCaseTemplates: [
      { scenario: 'content-generation', pattern: 'Generate {contentType} based on {inputCriteria}', difficulty: 'intermediate' },
      { scenario: 'data-analysis', pattern: 'Analyze {dataType} to extract {insights}', difficulty: 'advanced' },
      { scenario: 'automation', pattern: 'Automate {taskType} using {aiTechnique}', difficulty: 'beginner' }
    ],
    benefitsPattern: [
      'Achieve {accuracyLevel} accuracy on {taskType}',
      'Process {throughputRate} items per {timeUnit}',
      'Reduce {costMetric} by {improvementPercent}',
      'Enable {newCapabilities} not possible with traditional methods'
    ],
    limitationsPattern: [
      'Model performance depends on {qualityFactors}',
      'Requires {computeResources} for optimal performance',
      'May exhibit {biasConsiderations} in certain contexts'
    ],
    integrationPattern: 'Integrate through {apiInterface} with {supportedFormats} and {authenticationMethods}'
  },

  expertTemplate: {
    architecturePattern: 'Built on {modelArchitecture} with {trainingApproach} and {optimizationTechniques}',
    configurationTemplates: [
      { aspect: 'model_parameters', pattern: 'Configure {hyperparameters} for optimal {performanceMetric}', examples: ['temperature', 'top-p', 'max-tokens'] },
      { aspect: 'inference_optimization', pattern: 'Optimize inference with {optimizationTechniques}', examples: ['quantization', 'caching', 'batching'] }
    ],
    performanceTemplates: [
      { metric: 'accuracy', pattern: 'Achieves {accuracyScore} on {benchmarkDataset}', benchmarks: { classification: 0.95, generation: 0.87, extraction: 0.92 } },
      { metric: 'speed', pattern: 'Processing speed of {tokensPerSecond} tokens per second', benchmarks: { text: 100, code: 75, chat: 150 } }
    ],
    securityTemplates: [
      { aspect: 'data_privacy', pattern: 'Protects user data with {privacyMeasures}', compliance: ['GDPR', 'CCPA', 'SOC 2'] },
      { aspect: 'model_security', pattern: 'Implements {securityMeasures} against {threatTypes}', compliance: ['AI Ethics', 'Responsible AI'] }
    ],
    troubleshootingTemplates: [
      { category: 'quality', pattern: 'Output quality issues often caused by {qualityFactors}', escalation: 'Adjust {parameters} and review {inputQuality}' },
      { category: 'performance', pattern: 'Performance degradation typically related to {performanceFactors}', escalation: 'Check {resourceUtilization} and {modelConfiguration}' }
    ],
    extensibilityPattern: 'Extend through {extensionMechanisms} supporting {customizationOptions}'
  },

  // Additional templates would follow similar pattern...
  roleTemplates: {} as any,
  skillTemplates: {} as any,

  usagePatterns: [
    {
      patternId: 'text-generation',
      scenario: 'Generate text content',
      contextTriggers: ['generate text', 'create content', 'write', 'compose'],
      instructionPattern: 'Generate {contentType} about {topic} with {style} and {length}',
      expectedOutcomePattern: 'Generated {contentLength} of {contentType} with {qualityScore} quality',
      variationPoints: [
        { parameter: 'contentType', variations: ['article', 'summary', 'email', 'story', 'code'] },
        { parameter: 'style', variations: ['formal', 'casual', 'technical', 'creative'] }
      ]
    },
    {
      patternId: 'data-analysis',
      scenario: 'Analyze data with AI',
      contextTriggers: ['analyze data', 'extract insights', 'find patterns'],
      instructionPattern: 'Analyze {dataType} to identify {analysisGoal} using {technique}',
      expectedOutcomePattern: 'Identified {insightCount} insights with {confidenceLevel} confidence',
      variationPoints: [
        { parameter: 'analysisGoal', variations: ['trends', 'anomalies', 'classifications', 'predictions'] },
        { parameter: 'technique', variations: ['statistical', 'machine learning', 'deep learning'] }
      ]
    }
  ],

  conversationalTemplates: [
    {
      intent: 'generate_content',
      triggerPhrases: ['create', 'generate', 'write', 'compose'],
      responsePattern: 'I can help you generate {contentType} about {topic}. What style and length would you prefer?',
      followUpSuggestions: ['Would you like me to refine the tone?', 'Should I create variations?'],
      clarificationQuestions: ['What type of content do you need?', 'Who is the target audience?', 'What tone should I use?']
    },
    {
      intent: 'analyze_data',
      triggerPhrases: ['analyze', 'examine', 'study', 'investigate'],
      responsePattern: 'I can analyze your {dataType} to find {analysisGoal}. What specific insights are you looking for?',
      followUpSuggestions: ['Would you like me to create visualizations?', 'Should I provide recommendations?'],
      clarificationQuestions: ['What data should I analyze?', 'What patterns are you interested in?', 'How should I present the results?']
    }
  ],

  validationRules: [
    { rule: 'Must include AI safety and ethics considerations', severity: 'error' },
    { rule: 'Should specify model limitations and biases', severity: 'warning' },
    { rule: 'Must include performance benchmarks and accuracy metrics', severity: 'error' }
  ],

  qualityMetrics: [
    { metric: 'output_quality', target: 0.90 },
    { metric: 'safety_compliance', target: 1.0 },
    { metric: 'user_satisfaction', target: 0.85 }
  ],

  customizationPoints: [
    { point: 'model_selection', options: ['pre-trained', 'fine-tuned', 'custom-trained'] },
    { point: 'output_format', options: ['text', 'structured', 'multimodal'] },
    { point: 'quality_control', options: ['confidence-scoring', 'human-review', 'automated-validation'] }
  ],

  extensionMechanisms: [
    { extensionType: 'custom_models', mechanism: 'Model registry for custom and fine-tuned models' },
    { extensionType: 'preprocessing', mechanism: 'Pipeline system for custom input processing' },
    { extensionType: 'postprocessing', mechanism: 'Hook system for output filtering and enhancement' }
  ]
}

// =============================================================================
// Template Registry and Management
// =============================================================================

/**
 * Central registry for all description templates
 */
export class DescriptionTemplateRegistry {
  private templates: Map<string, EnhancedDescriptionTemplate> = new Map()

  constructor() {
    this.registerDefaultTemplates()
  }

  /**
   * Register a new template
   */
  registerTemplate(template: EnhancedDescriptionTemplate): void {
    this.templates.set(template.templateId, template)
    logger.debug(`Registered description template: ${template.templateId}`)
  }

  /**
   * Get template by category
   */
  getTemplate(category: ToolCategory): EnhancedDescriptionTemplate | null {
    // Find template by category
    for (const template of this.templates.values()) {
      if (template.category === category) {
        return template
      }
    }
    return null
  }

  /**
   * Get template by ID
   */
  getTemplateById(templateId: string): EnhancedDescriptionTemplate | null {
    return this.templates.get(templateId) || null
  }

  /**
   * List all available templates
   */
  listTemplates(): EnhancedDescriptionTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Validate template structure
   */
  validateTemplate(template: EnhancedDescriptionTemplate): ValidationResult {
    const issues: string[] = []

    // Check required fields
    if (!template.templateId) issues.push('Missing templateId')
    if (!template.category) issues.push('Missing category')
    if (!template.briefTemplate) issues.push('Missing briefTemplate')
    if (!template.detailedTemplate) issues.push('Missing detailedTemplate')

    // Validate template rules
    template.validationRules.forEach(rule => {
      // Apply validation logic based on rule
    })

    return {
      isValid: issues.length === 0,
      issues,
      qualityScore: this.calculateQualityScore(template)
    }
  }

  private registerDefaultTemplates(): void {
    this.registerTemplate(COMMUNICATION_TEMPLATES)
    this.registerTemplate(DATA_STORAGE_TEMPLATES)
    this.registerTemplate(AI_ML_TEMPLATES)

    logger.info('Default description templates registered')
  }

  private calculateQualityScore(template: EnhancedDescriptionTemplate): number {
    // Calculate quality score based on completeness and adherence to best practices
    let score = 0
    let maxScore = 0

    // Check completeness of different sections
    const sections = [
      'briefTemplate',
      'detailedTemplate',
      'expertTemplate',
      'roleTemplates',
      'skillTemplates',
      'usagePatterns',
      'conversationalTemplates'
    ]

    sections.forEach(section => {
      maxScore += 10
      if (template[section as keyof EnhancedDescriptionTemplate]) {
        score += 10
      }
    })

    return score / maxScore
  }
}

export interface ValidationResult {
  isValid: boolean
  issues: string[]
  qualityScore: number
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create template registry with default templates
 */
export function createDescriptionTemplateRegistry(): DescriptionTemplateRegistry {
  return new DescriptionTemplateRegistry()
}

/**
 * Get template for specific tool category
 */
export function getTemplateForCategory(category: ToolCategory): EnhancedDescriptionTemplate | null {
  const registry = createDescriptionTemplateRegistry()
  return registry.getTemplate(category)
}

/**
 * Validate description template
 */
export function validateDescriptionTemplate(template: EnhancedDescriptionTemplate): ValidationResult {
  const registry = createDescriptionTemplateRegistry()
  return registry.validateTemplate(template)
}