# Template System Architecture for Dynamic Journey Creation
*Journey Design Architecture Agent - Template System Specifications*

## Executive Summary

This document defines the comprehensive template system architecture that enables dynamic creation and customization of Parlant journeys from reusable templates. The system provides a powerful abstraction layer above the journey state machine, allowing for parameterized journey generation, template inheritance, and runtime customization while maintaining execution compatibility.

## Table of Contents

1. [Template System Overview](#template-system-overview)
2. [Template Architecture](#template-architecture)
3. [Template Types and Hierarchies](#template-types-and-hierarchies)
4. [Dynamic Instantiation Engine](#dynamic-instantiation-engine)
5. [Parameter Management System](#parameter-management-system)
6. [Template Validation Framework](#template-validation-framework)
7. [Runtime Customization Layer](#runtime-customization-layer)
8. [Template Repository and Discovery](#template-repository-and-discovery)
9. [Implementation Specifications](#implementation-specifications)
10. [Integration Patterns](#integration-patterns)

## Template System Overview

### Core Concept

The Template System provides a declarative approach to journey creation, allowing developers to define reusable journey patterns that can be dynamically instantiated with different parameters, customizations, and behavioral modifications.

### Key Features

- **Template Inheritance**: Multi-level template hierarchies with composition patterns
- **Parameter-Driven Generation**: Dynamic journey creation from configurable parameters
- **Runtime Customization**: Real-time modification of journey behavior and flow
- **Type Safety**: Full TypeScript support with compile-time validation
- **Versioning Support**: Template versioning with backward compatibility
- **Performance Optimization**: Template caching and optimized instantiation

## Template Architecture

### Core Template Structure

```typescript
/**
 * Base Template Definition
 */
export interface ParlantJourneyTemplate {
  // Template Identity
  templateId: string
  templateName: string
  version: string
  description: string

  // Template Metadata
  category: TemplateCategory
  tags: string[]
  author: string
  createdAt: Date
  updatedAt: Date

  // Template Hierarchy
  extendsTemplate?: string // Parent template ID
  composesTemplates?: string[] // Composed template IDs

  // Template Configuration
  parameters: TemplateParameter[]
  defaultValues: Record<string, any>
  requiredParameters: string[]

  // Journey Definition
  stateTemplates: StateTemplate[]
  transitionTemplates: TransitionTemplate[]

  // Behavioral Configuration
  executionConfig: TemplateExecutionConfig
  validationRules: TemplateValidationRule[]
  customizations: TemplateCustomization[]

  // Integration Settings
  requiredTools: string[]
  supportedModes: ExecutionMode[]
  compatibilityFlags: CompatibilityFlag[]
}

/**
 * Template Categories
 */
export enum TemplateCategory {
  WORKFLOW_AUTOMATION = 'workflow-automation',
  DATA_PROCESSING = 'data-processing',
  USER_INTERACTION = 'user-interaction',
  API_INTEGRATION = 'api-integration',
  BUSINESS_LOGIC = 'business-logic',
  DECISION_MAKING = 'decision-making',
  ERROR_HANDLING = 'error-handling',
  CUSTOM = 'custom'
}

/**
 * Template Parameters
 */
export interface TemplateParameter {
  parameterName: string
  displayName: string
  description: string

  // Type Information
  dataType: ParameterDataType
  schema?: JSONSchema

  // Validation Rules
  required: boolean
  defaultValue?: any
  constraints?: ParameterConstraints

  // UI Configuration
  inputType: ParameterInputType
  options?: ParameterOption[]
  dependsOn?: string[]

  // Template Binding
  bindingPath: string
  transformFunction?: string
}

export enum ParameterDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  ENUM = 'enum',
  FUNCTION = 'function',
  TEMPLATE_REFERENCE = 'template-reference'
}

export enum ParameterInputType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  DATE = 'date',
  TIME = 'time',
  JSON = 'json',
  CODE = 'code',
  TEMPLATE_PICKER = 'template-picker'
}
```

### State Template Architecture

```typescript
/**
 * State Template Definition
 */
export interface StateTemplate {
  // Template Identity
  templateId: string
  stateName: string
  description: string

  // State Configuration
  stateType: ParlantJourneyStateType
  isParametric: boolean
  parameters: string[] // Parameter names this state uses

  // Conditional Inclusion
  includeCondition?: TemplateCondition
  excludeCondition?: TemplateCondition

  // Dynamic Content
  messageTemplates: MessageTemplate[]
  actionTemplates: ActionTemplate[]

  // State Behavior
  executionConfig: StateExecutionConfig
  errorHandling: ErrorHandlingConfig

  // Customization Points
  customizationHooks: CustomizationHook[]
  extensionPoints: ExtensionPoint[]
}

/**
 * Message Templates with Dynamic Content
 */
export interface MessageTemplate {
  messageId: string
  messageType: 'entry' | 'exit' | 'error' | 'help' | 'confirmation' | 'custom'

  // Template Content
  template: string // Supports Handlebars-like syntax
  parameters: string[]

  // Localization
  locales: Record<string, string>

  // Conditional Display
  displayConditions: TemplateCondition[]

  // Personalization
  personalizationRules: PersonalizationRule[]
}

/**
 * Template Conditions for Dynamic Behavior
 */
export interface TemplateCondition {
  conditionId: string
  conditionType: 'parameter-value' | 'user-context' | 'system-state' | 'custom'

  // Condition Logic
  expression: string // JavaScript-like expression
  parameters: string[]

  // Evaluation Context
  evaluationScope: 'template' | 'instance' | 'runtime'
  cacheResult: boolean
}
```

## Template Types and Hierarchies

### Base Template Types

```typescript
/**
 * Atomic Templates - Single-purpose, reusable components
 */
export interface AtomicTemplate extends ParlantJourneyTemplate {
  templateType: 'atomic'

  // Single State Definition
  singleState: StateTemplate

  // Limited Customization
  allowedCustomizations: CustomizationType[]
}

/**
 * Composite Templates - Multi-state journey patterns
 */
export interface CompositeTemplate extends ParlantJourneyTemplate {
  templateType: 'composite'

  // Multiple States
  stateTemplates: StateTemplate[]
  transitionTemplates: TransitionTemplate[]

  // Composition Rules
  compositionRules: CompositionRule[]
  stateOrdering: StateOrderingRule[]
}

/**
 * Abstract Templates - Base templates for inheritance
 */
export interface AbstractTemplate extends ParlantJourneyTemplate {
  templateType: 'abstract'

  // Abstract Definition
  abstractStates: AbstractStateDefinition[]
  implementationRequirements: ImplementationRequirement[]

  // Inheritance Rules
  inheritanceRules: InheritanceRule[]
  extensibilityPoints: ExtensibilityPoint[]
}

/**
 * Specialized Domain Templates
 */
export interface WorkflowTemplate extends CompositeTemplate {
  domainType: 'workflow'

  // Workflow-specific Configuration
  workflowMetadata: WorkflowMetadata
  stepTemplates: WorkflowStepTemplate[]

  // Workflow Execution
  parallelExecution: boolean
  checkpointStrategy: CheckpointStrategy
}

export interface APIIntegrationTemplate extends CompositeTemplate {
  domainType: 'api-integration'

  // API Configuration
  apiEndpoints: APIEndpointTemplate[]
  authenticationTemplate: AuthenticationTemplate

  // Error Recovery
  retryStrategies: RetryStrategy[]
  fallbackBehaviors: FallbackBehavior[]
}
```

### Template Inheritance Patterns

```typescript
/**
 * Template Inheritance Engine
 */
export interface TemplateInheritanceEngine {
  /**
   * Resolve template hierarchy and merge configurations
   */
  resolveInheritance(templateId: string): ResolvedTemplate

  /**
   * Validate inheritance chain for conflicts
   */
  validateInheritanceChain(templateId: string): InheritanceValidationResult

  /**
   * Apply inheritance rules and merge strategies
   */
  applyInheritanceRules(
    baseTemplate: ParlantJourneyTemplate,
    parentTemplate: ParlantJourneyTemplate,
    mergeStrategy: MergeStrategy
  ): ParlantJourneyTemplate
}

/**
 * Inheritance Rules and Strategies
 */
export interface InheritanceRule {
  ruleId: string
  ruleType: 'merge' | 'override' | 'extend' | 'compose'

  // Target Specification
  targetPath: string // JSONPath expression
  mergeStrategy: MergeStrategy

  // Conditions
  applicableWhen: TemplateCondition[]
  priority: number
}

export enum MergeStrategy {
  MERGE_DEEP = 'merge-deep',
  MERGE_SHALLOW = 'merge-shallow',
  OVERRIDE = 'override',
  EXTEND_ARRAY = 'extend-array',
  COMPOSE = 'compose',
  CUSTOM = 'custom'
}
```

## Dynamic Instantiation Engine

### Template Instantiation Process

```typescript
/**
 * Template Instantiation Engine
 */
export interface TemplateInstantiationEngine {
  /**
   * Create journey instance from template
   */
  instantiateTemplate(
    templateId: string,
    parameters: Record<string, any>,
    customizations?: TemplateCustomization[]
  ): Promise<ParlantJourneyInstance>

  /**
   * Validate parameters against template schema
   */
  validateParameters(
    templateId: string,
    parameters: Record<string, any>
  ): ParameterValidationResult

  /**
   * Preview journey structure without full instantiation
   */
  previewJourney(
    templateId: string,
    parameters: Record<string, any>
  ): JourneyPreview
}

/**
 * Journey Instance from Template
 */
export interface ParlantJourneyInstance {
  // Instance Identity
  instanceId: string
  templateId: string
  version: string

  // Instance Configuration
  parameters: Record<string, any>
  appliedCustomizations: TemplateCustomization[]

  // Generated Journey
  states: ParlantJourneyState[]
  transitions: ParlantJourneyTransition[]

  // Instance Metadata
  createdAt: Date
  createdBy: string
  workspaceId: string

  // Runtime State
  executionState: InstanceExecutionState
  customizations: RuntimeCustomization[]
}

/**
 * Dynamic Content Resolution
 */
export interface ContentResolutionEngine {
  /**
   * Resolve template variables and expressions
   */
  resolveContent(
    template: string,
    parameters: Record<string, any>,
    context: ResolutionContext
  ): string

  /**
   * Evaluate template conditions
   */
  evaluateCondition(
    condition: TemplateCondition,
    parameters: Record<string, any>,
    context: ResolutionContext
  ): boolean

  /**
   * Apply personalization rules
   */
  personalizeContent(
    content: string,
    userProfile: UserProfile,
    rules: PersonalizationRule[]
  ): string
}
```

### Parameter Processing System

```typescript
/**
 * Parameter Processing Pipeline
 */
export interface ParameterProcessor {
  /**
   * Process and validate all parameters
   */
  processParameters(
    templateId: string,
    rawParameters: Record<string, any>
  ): ProcessedParameters

  /**
   * Apply parameter transformations
   */
  transformParameters(
    parameters: Record<string, any>,
    transformations: ParameterTransformation[]
  ): Record<string, any>

  /**
   * Resolve parameter dependencies
   */
  resolveDependencies(
    parameters: Record<string, any>,
    dependencies: ParameterDependency[]
  ): Record<string, any>
}

/**
 * Parameter Validation System
 */
export interface ParameterValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]

  // Processed Values
  processedParameters: Record<string, any>
  appliedDefaults: string[]

  // Suggestions
  suggestions: ParameterSuggestion[]
}

/**
 * Advanced Parameter Features
 */
export interface ParameterConstraints {
  // Value Constraints
  minValue?: number
  maxValue?: number
  minLength?: number
  maxLength?: number
  pattern?: string

  // Relationship Constraints
  requiredWith?: string[]
  excludesWith?: string[]
  dependsOn?: ParameterDependency[]

  // Custom Validation
  customValidator?: string
  validationMessage?: string
}

export interface ParameterDependency {
  dependentParameter: string
  dependencyType: 'required-if' | 'excluded-if' | 'value-derived' | 'conditional'
  condition: TemplateCondition
  transformFunction?: string
}
```

## Template Validation Framework

### Comprehensive Validation System

```typescript
/**
 * Template Validation Engine
 */
export interface TemplateValidationEngine {
  /**
   * Validate complete template structure
   */
  validateTemplate(template: ParlantJourneyTemplate): TemplateValidationResult

  /**
   * Validate template inheritance chain
   */
  validateInheritance(templateId: string): InheritanceValidationResult

  /**
   * Validate template instantiation
   */
  validateInstantiation(
    templateId: string,
    parameters: Record<string, any>
  ): InstantiationValidationResult

  /**
   * Performance validation and optimization suggestions
   */
  validatePerformance(template: ParlantJourneyTemplate): PerformanceValidationResult
}

/**
 * Multi-Level Validation Results
 */
export interface TemplateValidationResult {
  templateId: string
  isValid: boolean

  // Validation Categories
  structuralValidation: StructuralValidationResult
  semanticValidation: SemanticValidationResult
  performanceValidation: PerformanceValidationResult
  compatibilityValidation: CompatibilityValidationResult

  // Aggregated Results
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]

  // Validation Metadata
  validatedAt: Date
  validationVersion: string
  validationDuration: number
}

/**
 * Structural Validation
 */
export interface StructuralValidationResult {
  schemaCompliance: boolean
  requiredFieldsPresent: boolean
  dataTypeConsistency: boolean

  // Reference Validation
  invalidReferences: string[]
  circularDependencies: string[]

  // Template Hierarchy
  inheritanceChainValid: boolean
  compositionValid: boolean
}

/**
 * Semantic Validation
 */
export interface SemanticValidationResult {
  logicalConsistency: boolean
  businessRuleCompliance: boolean

  // State Machine Validation
  stateReachability: StateReachabilityAnalysis
  transitionConsistency: boolean
  deadlockDetection: DeadlockAnalysis

  // Parameter Validation
  parameterConsistency: boolean
  parameterUsageValid: boolean
}
```

### Quality Assurance Rules

```typescript
/**
 * Template Quality Rules
 */
export interface TemplateQualityRule {
  ruleId: string
  ruleName: string
  description: string

  // Rule Configuration
  severity: 'error' | 'warning' | 'suggestion'
  category: QualityCategory

  // Rule Logic
  validator: (template: ParlantJourneyTemplate) => QualityRuleResult
  autoFix?: (template: ParlantJourneyTemplate) => ParlantJourneyTemplate

  // Rule Metadata
  applicableTemplateTypes: string[]
  requiredFeatures: string[]
}

export enum QualityCategory {
  STRUCTURE = 'structure',
  SEMANTICS = 'semantics',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  USABILITY = 'usability',
  MAINTAINABILITY = 'maintainability'
}

/**
 * Built-in Quality Rules
 */
export const TEMPLATE_QUALITY_RULES: TemplateQualityRule[] = [
  {
    ruleId: 'no-unreachable-states',
    ruleName: 'No Unreachable States',
    description: 'All states must be reachable from start state',
    severity: 'error',
    category: QualityCategory.SEMANTICS,
    validator: validateStateReachability,
    applicableTemplateTypes: ['composite', 'workflow']
  },
  {
    ruleId: 'parameter-usage-validation',
    ruleName: 'Parameter Usage Validation',
    description: 'All parameters must be used, all used values must be declared',
    severity: 'warning',
    category: QualityCategory.STRUCTURE,
    validator: validateParameterUsage,
    autoFix: fixUnusedParameters
  },
  // ... more quality rules
]
```

## Runtime Customization Layer

### Dynamic Customization System

```typescript
/**
 * Runtime Customization Manager
 */
export interface RuntimeCustomizationManager {
  /**
   * Apply runtime customization to journey instance
   */
  applyCustomization(
    instanceId: string,
    customization: RuntimeCustomization
  ): Promise<CustomizationResult>

  /**
   * Revert customization
   */
  revertCustomization(
    instanceId: string,
    customizationId: string
  ): Promise<void>

  /**
   * Preview customization effects
   */
  previewCustomization(
    instanceId: string,
    customization: RuntimeCustomization
  ): CustomizationPreview
}

/**
 * Runtime Customization Types
 */
export interface RuntimeCustomization {
  customizationId: string
  customizationType: CustomizationType

  // Target Specification
  targetPath: string
  targetScope: 'state' | 'transition' | 'parameter' | 'global'

  // Customization Data
  customizationData: Record<string, any>

  // Application Rules
  applyCondition?: TemplateCondition
  priority: number

  // Metadata
  appliedAt: Date
  appliedBy: string
  description: string
}

export enum CustomizationType {
  CONTENT_OVERRIDE = 'content-override',
  BEHAVIOR_MODIFICATION = 'behavior-modification',
  STATE_INSERTION = 'state-insertion',
  TRANSITION_MODIFICATION = 'transition-modification',
  PARAMETER_BINDING = 'parameter-binding',
  UI_CUSTOMIZATION = 'ui-customization',
  LOGIC_INJECTION = 'logic-injection'
}

/**
 * Customization Hooks System
 */
export interface CustomizationHook {
  hookId: string
  hookName: string
  description: string

  // Hook Configuration
  hookType: HookType
  executionPhase: ExecutionPhase

  // Hook Implementation
  hookFunction: string // Function name or inline code
  parameters: Record<string, any>

  // Hook Constraints
  allowedCustomizations: CustomizationType[]
  securityLevel: SecurityLevel
}

export enum HookType {
  PRE_STATE_ENTRY = 'pre-state-entry',
  POST_STATE_ENTRY = 'post-state-entry',
  PRE_STATE_EXIT = 'pre-state-exit',
  POST_STATE_EXIT = 'post-state-exit',
  PRE_TRANSITION = 'pre-transition',
  POST_TRANSITION = 'post-transition',
  PARAMETER_PROCESSING = 'parameter-processing',
  ERROR_HANDLING = 'error-handling',
  CUSTOM = 'custom'
}
```

## Template Repository and Discovery

### Template Management System

```typescript
/**
 * Template Repository Interface
 */
export interface TemplateRepository {
  /**
   * Template CRUD Operations
   */
  saveTemplate(template: ParlantJourneyTemplate): Promise<string>
  getTemplate(templateId: string, version?: string): Promise<ParlantJourneyTemplate>
  updateTemplate(template: ParlantJourneyTemplate): Promise<void>
  deleteTemplate(templateId: string, version?: string): Promise<void>

  /**
   * Template Discovery
   */
  searchTemplates(query: TemplateSearchQuery): Promise<TemplateSearchResult[]>
  getTemplatesByCategory(category: TemplateCategory): Promise<ParlantJourneyTemplate[]>
  getRelatedTemplates(templateId: string): Promise<ParlantJourneyTemplate[]>

  /**
   * Version Management
   */
  getTemplateVersions(templateId: string): Promise<TemplateVersion[]>
  createTemplateVersion(templateId: string): Promise<string>
  getTemplateDiff(templateId: string, fromVersion: string, toVersion: string): Promise<TemplateDiff>

  /**
   * Template Analytics
   */
  getTemplateUsage(templateId: string): Promise<TemplateUsageStats>
  getPopularTemplates(limit: number): Promise<ParlantJourneyTemplate[]>
}

/**
 * Template Search and Discovery
 */
export interface TemplateSearchQuery {
  // Text Search
  query?: string
  searchFields?: string[]

  // Category Filters
  categories?: TemplateCategory[]
  tags?: string[]

  // Metadata Filters
  author?: string
  dateRange?: DateRange

  // Feature Filters
  requiredTools?: string[]
  supportedModes?: ExecutionMode[]

  // Advanced Filters
  parameterCount?: NumberRange
  complexity?: ComplexityLevel

  // Result Configuration
  sortBy?: 'relevance' | 'popularity' | 'created' | 'updated'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Template Marketplace Features
 */
export interface TemplateMarketplace {
  /**
   * Template Publishing
   */
  publishTemplate(template: ParlantJourneyTemplate): Promise<PublishResult>

  /**
   * Template Ratings and Reviews
   */
  rateTemplate(templateId: string, rating: TemplateRating): Promise<void>
  getTemplateRatings(templateId: string): Promise<TemplateRating[]>

  /**
   * Template Collections
   */
  createCollection(collection: TemplateCollection): Promise<string>
  addToCollection(collectionId: string, templateId: string): Promise<void>

  /**
   * Template Recommendations
   */
  getRecommendations(userId: string): Promise<TemplateRecommendation[]>
}
```

## Implementation Specifications

### Core Implementation Classes

```typescript
/**
 * Template Engine Implementation
 */
export class ParlantTemplateEngine implements TemplateInstantiationEngine {
  private repository: TemplateRepository
  private validator: TemplateValidationEngine
  private contentResolver: ContentResolutionEngine
  private customizationManager: RuntimeCustomizationManager

  constructor(
    repository: TemplateRepository,
    validator: TemplateValidationEngine,
    contentResolver: ContentResolutionEngine,
    customizationManager: RuntimeCustomizationManager
  ) {
    this.repository = repository
    this.validator = validator
    this.contentResolver = contentResolver
    this.customizationManager = customizationManager
  }

  async instantiateTemplate(
    templateId: string,
    parameters: Record<string, any>,
    customizations?: TemplateCustomization[]
  ): Promise<ParlantJourneyInstance> {
    // Implementation details...

    // 1. Load and resolve template hierarchy
    const resolvedTemplate = await this.loadAndResolveTemplate(templateId)

    // 2. Validate parameters
    const validation = await this.validator.validateParameters(templateId, parameters)
    if (!validation.isValid) {
      throw new TemplateInstantiationError('Parameter validation failed', validation.errors)
    }

    // 3. Process parameters and resolve content
    const processedParams = await this.processParameters(resolvedTemplate, parameters)

    // 4. Generate journey states and transitions
    const states = await this.generateStates(resolvedTemplate, processedParams)
    const transitions = await this.generateTransitions(resolvedTemplate, processedParams)

    // 5. Apply customizations
    if (customizations && customizations.length > 0) {
      await this.applyCustomizations(states, transitions, customizations)
    }

    // 6. Create and return instance
    return {
      instanceId: generateId(),
      templateId,
      version: resolvedTemplate.version,
      parameters: processedParams,
      appliedCustomizations: customizations || [],
      states,
      transitions,
      createdAt: new Date(),
      createdBy: getCurrentUserId(),
      workspaceId: getCurrentWorkspaceId(),
      executionState: 'initialized',
      customizations: []
    }
  }

  private async loadAndResolveTemplate(templateId: string): Promise<ParlantJourneyTemplate> {
    // Load template with inheritance resolution
    // Apply composition rules
    // Validate resolved template
  }

  private async generateStates(
    template: ParlantJourneyTemplate,
    parameters: Record<string, any>
  ): Promise<ParlantJourneyState[]> {
    // Generate states from state templates
    // Resolve conditional states
    // Apply parameter bindings
  }

  private async generateTransitions(
    template: ParlantJourneyTemplate,
    parameters: Record<string, any>
  ): Promise<ParlantJourneyTransition[]> {
    // Generate transitions from transition templates
    // Resolve conditional transitions
    // Apply parameter bindings
  }
}

/**
 * Template Repository Implementation
 */
export class DrizzleTemplateRepository implements TemplateRepository {
  private db: DrizzleDB

  constructor(db: DrizzleDB) {
    this.db = db
  }

  async saveTemplate(template: ParlantJourneyTemplate): Promise<string> {
    // Save template to database with proper schema mapping
    // Handle template versioning
    // Update search indices
  }

  async searchTemplates(query: TemplateSearchQuery): Promise<TemplateSearchResult[]> {
    // Build dynamic SQL query based on search criteria
    // Apply full-text search
    // Return paginated results with relevance scoring
  }

  // ... other repository methods
}
```

### Database Schema Extensions

```typescript
/**
 * Template Tables for PostgreSQL/Drizzle Schema
 */
export const parlantTemplatesTable = pgTable('parlant_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: text('template_id').unique().notNull(),
  templateName: text('template_name').notNull(),
  version: text('version').notNull(),
  description: text('description'),

  // Template Metadata
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>(),
  author: text('author').notNull(),

  // Template Content
  templateData: jsonb('template_data').$type<ParlantJourneyTemplate>().notNull(),

  // Hierarchy
  extendsTemplate: text('extends_template'),
  composesTemplates: jsonb('composes_templates').$type<string[]>(),

  // Status and Metadata
  status: text('status').notNull().default('draft'), // draft, published, deprecated
  isPublic: boolean('is_public').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),

  // Workspace Association
  workspaceId: uuid('workspace_id').notNull(),
})

export const templateInstancesTable = pgTable('template_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  instanceId: text('instance_id').unique().notNull(),
  templateId: text('template_id').notNull(),
  templateVersion: text('template_version').notNull(),

  // Instance Data
  parameters: jsonb('parameters').$type<Record<string, any>>().notNull(),
  generatedJourneyId: uuid('generated_journey_id'),

  // Instance Status
  status: text('status').notNull().default('created'), // created, active, completed, failed

  // Instance Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
})

export const templateUsageStatsTable = pgTable('template_usage_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: text('template_id').notNull(),

  // Usage Metrics
  totalInstantiations: integer('total_instantiations').default(0),
  successfulInstantiations: integer('successful_instantiations').default(0),
  failedInstantiations: integer('failed_instantiations').default(0),

  // Performance Metrics
  avgInstantiationTime: integer('avg_instantiation_time'), // milliseconds
  avgExecutionTime: integer('avg_execution_time'), // milliseconds

  // Ratings
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  totalRatings: integer('total_ratings').default(0),

  // Time Tracking
  lastUsed: timestamp('last_used'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

## Integration Patterns

### Workflow Integration

```typescript
/**
 * ReactFlow to Template Integration
 */
export interface WorkflowTemplateGenerator {
  /**
   * Generate template from existing ReactFlow workflow
   */
  generateTemplateFromWorkflow(
    workflowId: string,
    templateConfig: TemplateGenerationConfig
  ): Promise<ParlantJourneyTemplate>

  /**
   * Create parameterized template from workflow pattern
   */
  createParameterizedTemplate(
    workflowId: string,
    parameterMappings: WorkflowParameterMapping[]
  ): Promise<ParlantJourneyTemplate>
}

/**
 * Template-Driven Workflow Creation
 */
export interface TemplateWorkflowBridge {
  /**
   * Create workflow from journey template
   */
  createWorkflowFromTemplate(
    templateId: string,
    parameters: Record<string, any>
  ): Promise<ReactFlowWorkflow>

  /**
   * Synchronize template changes to workflows
   */
  synchronizeTemplateToWorkflows(
    templateId: string,
    workflowIds: string[]
  ): Promise<SynchronizationResult[]>
}
```

### API Integration

```typescript
/**
 * Template Management API
 */
export class TemplateManagementAPI {

  @post('/api/templates')
  async createTemplate(
    @body template: CreateTemplateRequest
  ): Promise<CreateTemplateResponse> {
    // Validate template structure
    // Save to repository
    // Return template ID and metadata
  }

  @get('/api/templates/:templateId/instantiate')
  async instantiateTemplate(
    @param('templateId') templateId: string,
    @query parameters: Record<string, any>
  ): Promise<InstantiateTemplateResponse> {
    // Load template
    // Validate parameters
    // Create journey instance
    // Return instance details
  }

  @get('/api/templates/search')
  async searchTemplates(
    @query query: TemplateSearchQuery
  ): Promise<TemplateSearchResponse> {
    // Execute template search
    // Return paginated results with metadata
  }

  @post('/api/templates/:templateId/customize')
  async applyCustomization(
    @param('templateId') templateId: string,
    @body customization: RuntimeCustomization
  ): Promise<CustomizationResponse> {
    // Apply runtime customization
    // Return updated instance state
  }
}
```

## Performance Optimization

### Template Caching Strategy

```typescript
/**
 * Multi-Level Template Caching
 */
export interface TemplateCacheManager {
  // Template Definition Cache
  getTemplate(templateId: string): Promise<ParlantJourneyTemplate | null>
  cacheTemplate(template: ParlantJourneyTemplate, ttl?: number): Promise<void>

  // Resolved Template Cache (with inheritance)
  getResolvedTemplate(templateId: string): Promise<ParlantJourneyTemplate | null>
  cacheResolvedTemplate(template: ParlantJourneyTemplate, ttl?: number): Promise<void>

  // Instantiation Cache
  getCachedInstance(cacheKey: string): Promise<ParlantJourneyInstance | null>
  cacheInstance(instance: ParlantJourneyInstance, cacheKey: string, ttl?: number): Promise<void>

  // Cache Management
  invalidateTemplate(templateId: string): Promise<void>
  clearCache(): Promise<void>
  getCacheStats(): Promise<CacheStats>
}

/**
 * Template Pre-compilation
 */
export interface TemplatePrecompiler {
  /**
   * Pre-compile template for faster instantiation
   */
  precompileTemplate(templateId: string): Promise<PrecompiledTemplate>

  /**
   * Get pre-compiled template
   */
  getPrecompiledTemplate(templateId: string): Promise<PrecompiledTemplate | null>
}
```

## Conclusion

The Template System Architecture provides a comprehensive framework for dynamic journey creation that enables:

1. **Powerful Abstraction**: Templates abstract journey complexity while maintaining full flexibility
2. **Reusability**: Templates can be composed, inherited, and customized for different use cases
3. **Type Safety**: Full TypeScript support ensures compile-time validation and developer experience
4. **Performance**: Caching, pre-compilation, and optimization strategies ensure fast instantiation
5. **Extensibility**: Customization hooks and extension points allow for future enhancements
6. **Integration**: Seamless integration with existing ReactFlow workflows and Parlant journeys

This system forms the foundation for a powerful, scalable template ecosystem that enables rapid development of conversational workflows while maintaining consistency and quality across all journey implementations.