/**
 * Template System Type Definitions
 * ================================
 *
 * Core types for the template system including parameter definitions,
 * inheritance patterns, validation rules, and template configurations.
 */

import type { z } from "zod";

// ============================================================================
// Base Template Types
// ============================================================================

export type TemplateParameterType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "json"
  | "enum"
  | "date"
  | "reference";

export interface TemplateParameter {
  id: string;
  name: string;
  type: TemplateParameterType;
  description: string;
  defaultValue?: any;
  required: boolean;
  validation: ParameterValidation;
  displayOrder: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ParameterValidation {
  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "email" | "url" | "uuid" | "json" | "custom";

  // Number validations
  min?: number;
  max?: number;
  multipleOf?: number;

  // Array validations
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  itemSchema?: z.ZodSchema;

  // Object validations
  properties?: Record<string, z.ZodSchema>;
  additionalProperties?: boolean;
  required?: string[];

  // Enum validations
  options?: Array<{ value: any; label: string; description?: string }>;

  // Reference validations
  referenceType?: "workspace" | "agent" | "workflow" | "tool" | "journey";
  referenceFilter?: Record<string, any>;

  // Custom validation function
  customValidator?: (
    value: any,
    context: ValidationContext,
  ) => ValidationResult;
}

export interface ValidationContext {
  templateId: string;
  workspaceId: string;
  userId?: string;
  agentId?: string;
  existingParameters: Record<string, any>;
  environment: "development" | "production" | "test";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  context?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

// ============================================================================
// Template Definition Types
// ============================================================================

export interface WorkflowTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  workflowId: string;
  version: string;

  // Template structure
  parameters: TemplateParameter[];
  workflowData: WorkflowTemplateData;
  tags: string[];

  // Inheritance and composition
  parentTemplateId?: string;
  mixins: string[];
  overrides: TemplateOverrides;

  // Configuration
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedCompletionTime?: number; // minutes

  // Usage and analytics
  usageCount: number;
  averageRating?: number;
  totalRatings?: number;

  // Metadata
  author: string;
  authorId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isVerified: boolean;
  isDeprecated: boolean;

  // Localization
  localizations: Record<string, TemplateLocalization>;
}

export interface WorkflowTemplateData {
  // Original workflow structure
  blocks: TemplateBlock[];
  edges: TemplateEdge[];
  variables: Record<string, any>;

  // Template-specific mappings
  parameterMappings: ParameterMapping[];
  conditionalBlocks: ConditionalBlock[];
  dynamicContent: DynamicContentSection[];

  // Optimization hints
  optimizationHints: OptimizationHint[];
  performanceSettings: PerformanceSettings;
}

export interface TemplateBlock {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: Record<string, any>;

  // Template enhancements
  isParameterized: boolean;
  parameterBindings: ParameterBinding[];
  conditionalVisibility?: ConditionalExpression;
  dynamicProperties: DynamicProperty[];
}

export interface TemplateEdge {
  id: string;
  sourceBlockId: string;
  targetBlockId: string;
  sourceHandle?: string;
  targetHandle?: string;

  // Template enhancements
  conditionalConnection?: ConditionalExpression;
  dynamicRouting?: DynamicRoutingRule[];
}

export interface ParameterMapping {
  parameterId: string;
  targetPath: string; // JSONPath to the target field
  transformation?: TransformationRule;
  conditional?: ConditionalExpression;
}

export interface ParameterBinding {
  parameterId: string;
  propertyPath: string;
  bindingType: "direct" | "computed" | "conditional";
  computationRule?: ComputationRule;
  conditional?: ConditionalExpression;
}

// ============================================================================
// Inheritance and Composition Types
// ============================================================================

export interface TemplateOverrides {
  parameters: ParameterOverride[];
  blocks: BlockOverride[];
  edges: EdgeOverride[];
  metadata: MetadataOverride;
}

export interface ParameterOverride {
  parameterId: string;
  operation: "add" | "update" | "remove" | "replace";
  newValue?: Partial<TemplateParameter>;
}

export interface BlockOverride {
  blockId: string;
  operation: "add" | "update" | "remove" | "replace";
  newValue?: Partial<TemplateBlock>;
  insertAfter?: string;
  insertBefore?: string;
}

export interface EdgeOverride {
  edgeId: string;
  operation: "add" | "update" | "remove" | "replace";
  newValue?: Partial<TemplateEdge>;
}

export interface MetadataOverride {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
}

export interface TemplateMixin {
  id: string;
  name: string;
  description: string;
  parametersToAdd: TemplateParameter[];
  blocksToAdd: TemplateBlock[];
  edgesToAdd: TemplateEdge[];
  transformations: MixinTransformation[];
}

export interface MixinTransformation {
  type: "parameter_injection" | "block_modification" | "edge_rerouting";
  targetId: string;
  rule: TransformationRule;
}

// ============================================================================
// Dynamic Content and Computation Types
// ============================================================================

export interface ConditionalExpression {
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "contains"
    | "matches"
    | "and"
    | "or"
    | "not";
  operands: Array<ConditionalOperand>;
  metadata?: Record<string, any>;
}

export interface ConditionalOperand {
  type: "parameter" | "constant" | "computed" | "expression";
  value: any;
  parameterId?: string;
  computationRule?: ComputationRule;
  expression?: ConditionalExpression;
}

export interface ComputationRule {
  type: "javascript" | "jsonpath" | "template" | "builtin";
  expression: string;
  dependencies: string[];
  cacheability: "static" | "session" | "dynamic";
  timeout?: number;
}

export interface TransformationRule {
  type: "direct" | "computed" | "lookup" | "format";
  expression?: string;
  lookupTable?: Record<string, any>;
  formatString?: string;
  defaultValue?: any;
}

export interface ConditionalBlock {
  conditionId: string;
  condition: ConditionalExpression;
  blocksToShow: string[];
  blocksToHide: string[];
  edgesToActivate: string[];
  edgesToDeactivate: string[];
}

export interface DynamicContentSection {
  id: string;
  name: string;
  type: "repeater" | "conditional" | "computed";
  source: DynamicContentSource;
  template: DynamicContentTemplate;
}

export interface DynamicContentSource {
  type: "parameter" | "api" | "database" | "computed";
  parameterId?: string;
  apiEndpoint?: string;
  databaseQuery?: string;
  computationRule?: ComputationRule;
}

export interface DynamicContentTemplate {
  blockTemplate: TemplateBlock;
  edgeTemplates: TemplateEdge[];
  parameterBindings: ParameterBinding[];
}

export interface DynamicProperty {
  propertyPath: string;
  valueSource: DynamicContentSource;
  transformation?: TransformationRule;
  caching: CachingStrategy;
}

export interface DynamicRoutingRule {
  condition: ConditionalExpression;
  targetBlockId: string;
  priority: number;
}

// ============================================================================
// Optimization and Performance Types
// ============================================================================

export interface OptimizationHint {
  type: "performance" | "memory" | "network" | "user_experience";
  description: string;
  impact: "low" | "medium" | "high";
  implementation: string;
  conditions?: ConditionalExpression[];
}

export interface PerformanceSettings {
  enableCaching: boolean;
  cacheStrategy: CachingStrategy;
  prefetchParameters: boolean;
  optimizeRendering: boolean;
  lazyLoadBlocks: boolean;
  compressionLevel: "none" | "basic" | "aggressive";
}

export interface CachingStrategy {
  scope: "user" | "session" | "workspace" | "global";
  duration: number; // seconds
  invalidationRules: CacheInvalidationRule[];
  compressionEnabled: boolean;
}

export interface CacheInvalidationRule {
  trigger: "parameter_change" | "time_based" | "dependency_change" | "manual";
  parameters?: string[];
  dependencies?: string[];
  timeInterval?: number;
}

// ============================================================================
// Localization and Internationalization Types
// ============================================================================

export interface TemplateLocalization {
  locale: string;
  name: string;
  description?: string;
  parameterLabels: Record<string, string>;
  parameterDescriptions: Record<string, string>;
  blockLabels: Record<string, string>;
  validationMessages: Record<string, string>;
  helpTexts: Record<string, string>;
}

// ============================================================================
// Template Registry Types
// ============================================================================

export interface TemplateSearchFilters {
  category?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  author?: string;
  rating?: number;
  usageCount?: { min?: number; max?: number };
  workspaceId?: string;
  isPublic?: boolean;
  isVerified?: boolean;
  hasParameters?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  query?: string;
}

export interface TemplateSearchResult {
  templates: WorkflowTemplate[];
  totalCount: number;
  facets: SearchFacets;
  suggestions: string[];
  relatedTemplates: WorkflowTemplate[];
}

export interface SearchFacets {
  categories: Array<{ category: string; count: number }>;
  tags: Array<{ tag: string; count: number }>;
  authors: Array<{ author: string; count: number }>;
  difficulties: Array<{ difficulty: string; count: number }>;
}

// ============================================================================
// Template Analytics Types
// ============================================================================

export interface TemplateAnalytics {
  templateId: string;

  // Usage metrics
  totalUsage: number;
  uniqueUsers: number;
  averageUsagePerUser: number;
  usageByPeriod: UsagePeriodData[];

  // Performance metrics
  averageGenerationTime: number;
  averageJourneyDuration: number;
  completionRate: number;
  errorRate: number;

  // User feedback
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  userComments: UserComment[];

  // Parameter usage
  parameterUsageStats: ParameterUsageStats[];

  // Conversion metrics
  journeysGenerated: number;
  successfulConversions: number;
  conversionFailures: ConversionFailure[];
}

export interface UsagePeriodData {
  period: string; // ISO date string
  usage: number;
  uniqueUsers: number;
  conversions: number;
}

export interface UserComment {
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  isVerified: boolean;
}

export interface ParameterUsageStats {
  parameterId: string;
  parameterName: string;
  usageCount: number;
  uniqueValues: number;
  mostCommonValues: Array<{ value: any; count: number }>;
  nullUsageCount: number;
  validationFailures: number;
}

export interface ConversionFailure {
  errorCode: string;
  errorMessage: string;
  count: number;
  lastOccurrence: Date;
  exampleParameters?: Record<string, any>;
}

// ============================================================================
// Template Import/Export Types
// ============================================================================

export interface TemplateExportData {
  template: WorkflowTemplate;
  dependencies: TemplateDependency[];
  assets: TemplateAsset[];
  exportMetadata: ExportMetadata;
}

export interface TemplateDependency {
  type: "parent_template" | "mixin" | "tool" | "workflow" | "agent";
  id: string;
  name: string;
  version?: string;
  required: boolean;
}

export interface TemplateAsset {
  type: "image" | "file" | "schema" | "config";
  name: string;
  path: string;
  data: string | Buffer;
  mimeType: string;
}

export interface ExportMetadata {
  exportedAt: Date;
  exportedBy: string;
  version: string;
  format: string;
  compatibility: string[];
  checksum: string;
}

export interface TemplateImportOptions {
  overwriteExisting: boolean;
  importDependencies: boolean;
  validateBeforeImport: boolean;
  mappingRules: ImportMappingRule[];
  targetWorkspaceId: string;
}

export interface ImportMappingRule {
  type: "workspace" | "user" | "tool" | "agent";
  sourceId: string;
  targetId: string;
  createIfMissing: boolean;
}
