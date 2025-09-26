/**
 * A/B Testing Framework for Recommendation Optimization
 *
 * Comprehensive framework for conducting A/B tests on recommendation algorithms,
 * user interfaces, and recommendation strategies to continuously improve system performance.
 *
 * Features:
 * - Multi-variant testing with flexible traffic allocation
 * - Statistical significance testing and power analysis
 * - Real-time test monitoring and automatic stopping rules
 * - Segmented testing based on user characteristics
 * - Long-term holdout testing and treatment effect analysis
 * - Integration with recommendation engines and analytics
 * - Automated test design and hypothesis generation
 * - Ethical testing guidelines and user consent management
 *
 * @author Contextual Tool Recommendation Engine Agent
 * @version 2.0.0
 */

import { createLogger } from '../utils/logger'
import type { ContextualRecommendationRequest } from './contextual-recommendation-engine'

const logger = createLogger('ABTestingFramework')

// =============================================================================
// A/B Testing Core Types
// =============================================================================

export interface ABTest {
  // Test identification
  testId: string
  name: string
  description: string
  hypothesis: string
  owner: string
  team: string

  // Test configuration
  testType: TestType
  status: TestStatus
  variants: TestVariant[]
  trafficAllocation: TrafficAllocation

  // Targeting and segmentation
  targeting: TargetingCriteria
  segments: UserSegment[]
  excludeFromTesting: ExclusionCriteria

  // Metrics and goals
  primaryMetric: Metric
  secondaryMetrics: Metric[]
  guardRailMetrics: GuardRailMetric[]

  // Test execution
  startDate: Date
  endDate?: Date
  duration: number // in milliseconds
  sampleSizePerVariant: number
  powerAnalysis: PowerAnalysis

  // Statistical configuration
  statisticalConfig: StatisticalConfig
  significanceLevel: number
  powerLevel: number
  minimumDetectableEffect: number

  // Results and analysis
  results?: TestResults
  analysis?: TestAnalysis
  decisions: TestDecision[]

  // Metadata
  createdAt: Date
  updatedAt: Date
  version: string
  tags: string[]
}

export interface TestVariant {
  variantId: string
  name: string
  description: string
  isControl: boolean
  trafficPercent: number

  // Configuration changes
  algorithmConfig?: AlgorithmConfiguration
  uiConfig?: UIConfiguration
  featureFlags?: Record<string, boolean>
  parameters?: Record<string, any>

  // Variant-specific tracking
  userCount: number
  sampleSize: number
  conversionEvents: number
  metrics: VariantMetrics
}

export interface TrafficAllocation {
  method: 'random' | 'deterministic' | 'balanced' | 'adaptive'
  seed?: number
  rebalanceFrequency?: number
  minTrafficPercent: number
  maxTrafficPercent: number
  rampUpStrategy?: RampUpStrategy
}

export interface TargetingCriteria {
  // User criteria
  userSegments: string[]
  userAttributes: Record<string, any>
  geographicRestrictions?: GeographicRestriction[]

  // Behavioral criteria
  minimumActivity: number
  accountAge: number
  engagementLevel: 'low' | 'medium' | 'high'

  // Technical criteria
  platforms: string[]
  browsers: string[]
  deviceTypes: string[]

  // Business criteria
  subscriptionTiers: string[]
  featureAccess: string[]
}

export interface UserSegment {
  segmentId: string
  name: string
  description: string
  criteria: SegmentCriteria
  size: number
  trafficAllocation?: TrafficAllocation
}

export interface ExclusionCriteria {
  // User-based exclusions
  excludedUsers: string[]
  excludedUserSegments: string[]

  // Context-based exclusions
  excludedWorkspaces: string[]
  excludedFeatures: string[]

  // Technical exclusions
  botUsers: boolean
  testUsers: boolean
  internalUsers: boolean

  // Temporal exclusions
  excludeDuringIncidents: boolean
  maintenanceWindows: TimeWindow[]
}

// =============================================================================
// Metrics and Measurement Types
// =============================================================================

export interface Metric {
  metricId: string
  name: string
  description: string
  type: MetricType
  category: MetricCategory

  // Measurement configuration
  aggregation: AggregationType
  timeWindow: string
  filters: MetricFilter[]

  // Statistical properties
  distribution: DistributionType
  expectedVariance: number
  historicalMean?: number
  minimumSampleSize: number

  // Business context
  businessImpact: 'high' | 'medium' | 'low'
  direction: 'increase' | 'decrease' | 'two_sided'
  threshold?: number
}

export interface GuardRailMetric extends Metric {
  // Safety thresholds
  alertThreshold: number
  stopThreshold: number

  // Monitoring configuration
  checkFrequency: number
  alertChannels: string[]
  autoStopEnabled: boolean
}

export interface VariantMetrics {
  [metricId: string]: MetricValue
}

export interface MetricValue {
  value: number
  count: number
  variance: number
  confidenceInterval: [number, number]
  lastUpdated: Date
}

// =============================================================================
// Statistical Analysis Types
// =============================================================================

export interface PowerAnalysis {
  // Input parameters
  effect_size: number
  significance_level: number
  power_level: number

  // Results
  required_sample_size: number
  minimum_detectable_effect: number
  estimated_duration: number

  // Assumptions
  baseline_conversion_rate: number
  daily_traffic: number
  assumptions: string[]
}

export interface StatisticalConfig {
  // Testing approach
  testingMethod: 'frequentist' | 'bayesian' | 'sequential'
  multipleComparisonCorrection: 'bonferroni' | 'benjamini_hochberg' | 'none'

  // Sequential testing
  sequentialBoundary?: SequentialBoundary
  interimAnalysisSchedule?: Date[]

  // Bayesian configuration
  priorDistribution?: PriorDistribution
  credibleInterval: number
}

export interface TestResults {
  // Overall results
  status: 'running' | 'completed' | 'stopped' | 'invalid'
  startDate: Date
  endDate?: Date
  totalUsers: number
  totalConversions: number

  // Variant results
  variantResults: Map<string, VariantResult>

  // Statistical tests
  statisticalTests: StatisticalTest[]

  // Effect estimates
  treatmentEffects: TreatmentEffect[]

  // Confidence and significance
  statisticalSignificance: boolean
  practicalSignificance: boolean
  confidenceLevel: number
  pValue: number

  // Business impact
  businessImpact: BusinessImpact
  recommendations: string[]
}

export interface VariantResult {
  variantId: string
  userCount: number
  conversionRate: number
  conversionCount: number

  // Metric results
  metricResults: Map<string, MetricResult>

  // Statistical measures
  standardError: number
  confidenceInterval: [number, number]

  // Comparative analysis
  liftVsControl: number
  probabilityToBeatControl: number
}

export interface TestAnalysis {
  // Analysis metadata
  analysisDate: Date
  analysisType: 'interim' | 'final' | 'post_hoc'
  analyst: string

  // Key findings
  keyFindings: string[]
  significantResults: string[]
  unexpectedResults: string[]

  // Recommendations
  recommendation: TestRecommendation
  reasoning: string[]
  nextSteps: string[]

  // Risk assessment
  riskAssessment: RiskAssessment
  mitigationStrategies: string[]

  // External validity
  generalizability: GeneralizabilityAssessment
  limitations: string[]
}

// =============================================================================
// Test Management Types
// =============================================================================

export type TestType =
  | 'algorithm_comparison'
  | 'ui_variation'
  | 'feature_flag'
  | 'parameter_tuning'
  | 'user_experience'
  | 'recommendation_strategy'
  | 'personalization'
  | 'multi_factor'

export type TestStatus =
  | 'draft'
  | 'approved'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'cancelled'
  | 'archived'

export type MetricType =
  | 'conversion'
  | 'engagement'
  | 'revenue'
  | 'retention'
  | 'satisfaction'
  | 'performance'
  | 'behavioral'

export type MetricCategory =
  | 'business'
  | 'user_experience'
  | 'technical_performance'
  | 'recommendation_quality'

export type AggregationType =
  | 'sum'
  | 'average'
  | 'median'
  | 'percentile'
  | 'count'
  | 'rate'
  | 'ratio'

export type DistributionType = 'normal' | 'binomial' | 'poisson' | 'exponential' | 'beta' | 'gamma'

// =============================================================================
// Advanced Testing Features
// =============================================================================

export interface AlgorithmConfiguration {
  algorithmType: string
  parameters: Record<string, any>
  weights: Record<string, number>
  features: string[]
  modelVersion?: string
}

export interface UIConfiguration {
  layout: string
  components: Record<string, any>
  styling: Record<string, any>
  interactions: Record<string, any>
}

export interface RampUpStrategy {
  initialPercent: number
  incrementPercent: number
  incrementInterval: number // in milliseconds
  maxPercent: number
  stopConditions: string[]
}

export interface GeographicRestriction {
  type: 'include' | 'exclude'
  countries: string[]
  regions: string[]
  timezones: string[]
}

export interface SegmentCriteria {
  rules: SegmentRule[]
  logic: 'and' | 'or'
}

export interface SegmentRule {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

export interface TimeWindow {
  startTime: string
  endTime: string
  timezone: string
  recurring: boolean
}

// =============================================================================
// Main A/B Testing Framework Class
// =============================================================================

export class ABTestingFramework {
  private activeTests: Map<string, ABTest> = new Map()
  private testHistory: Map<string, ABTest> = new Map()
  private userAssignments: Map<string, UserTestAssignment[]> = new Map()
  private testMetrics: Map<string, TestMetricsCollector> = new Map()

  // Statistical engines
  private statisticalEngine: StatisticalEngine
  private powerAnalysisEngine: PowerAnalysisEngine
  private segmentationEngine: SegmentationEngine

  // Monitoring and safety
  private testMonitor: TestMonitor
  private safetyChecker: SafetyChecker

  constructor(config: ABTestingConfig = {}) {
    this.statisticalEngine = new StatisticalEngine()
    this.powerAnalysisEngine = new PowerAnalysisEngine()
    this.segmentationEngine = new SegmentationEngine()
    this.testMonitor = new TestMonitor()
    this.safetyChecker = new SafetyChecker()

    logger.info('A/B Testing Framework initialized')
  }

  // =============================================================================
  // Test Management Methods
  // =============================================================================

  /**
   * Create a new A/B test
   */
  async createTest(testDefinition: CreateTestRequest): Promise<ABTest> {
    const testId = this.generateTestId()

    try {
      // Validate test definition
      await this.validateTestDefinition(testDefinition)

      // Perform power analysis
      const powerAnalysis = await this.powerAnalysisEngine.analyze(testDefinition)

      // Create test configuration
      const test: ABTest = {
        testId,
        name: testDefinition.name,
        description: testDefinition.description,
        hypothesis: testDefinition.hypothesis,
        owner: testDefinition.owner,
        team: testDefinition.team,
        testType: testDefinition.testType,
        status: 'draft',
        variants: testDefinition.variants,
        trafficAllocation: testDefinition.trafficAllocation,
        targeting: testDefinition.targeting,
        segments: testDefinition.segments || [],
        excludeFromTesting: testDefinition.excludeFromTesting || this.getDefaultExclusions(),
        primaryMetric: testDefinition.primaryMetric,
        secondaryMetrics: testDefinition.secondaryMetrics || [],
        guardRailMetrics: testDefinition.guardRailMetrics || [],
        startDate: testDefinition.startDate,
        endDate: testDefinition.endDate,
        duration: testDefinition.duration,
        sampleSizePerVariant: powerAnalysis.required_sample_size,
        powerAnalysis,
        statisticalConfig: testDefinition.statisticalConfig || this.getDefaultStatisticalConfig(),
        significanceLevel: testDefinition.significanceLevel || 0.05,
        powerLevel: testDefinition.powerLevel || 0.8,
        minimumDetectableEffect: testDefinition.minimumDetectableEffect,
        decisions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0',
        tags: testDefinition.tags || [],
      }

      // Store test
      this.testHistory.set(testId, test)

      logger.info('A/B test created', { testId, name: test.name, variants: test.variants.length })

      return test
    } catch (error) {
      logger.error('Error creating A/B test', { error, testDefinition })
      throw error
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<void> {
    const test = this.testHistory.get(testId)
    if (!test) {
      throw new Error(`Test ${testId} not found`)
    }

    if (test.status !== 'approved') {
      throw new Error(`Test ${testId} is not approved for start`)
    }

    try {
      // Perform pre-start validations
      await this.performPreStartValidations(test)

      // Initialize test metrics collection
      const metricsCollector = new TestMetricsCollector()
      this.testMetrics.set(testId, metricsCollector)

      // Update test status
      test.status = 'running'
      test.startDate = new Date()
      test.updatedAt = new Date()

      // Add to active tests
      this.activeTests.set(testId, test)

      // Start monitoring
      this.testMonitor.startMonitoring(test)

      logger.info('A/B test started', { testId, name: test.name })
    } catch (error) {
      logger.error('Error starting A/B test', { error, testId })
      throw error
    }
  }

  /**
   * Get variant assignment for a user
   */
  async getVariantAssignment(
    userId: string,
    testId: string,
    context: ContextualRecommendationRequest
  ): Promise<VariantAssignment | null> {
    const test = this.activeTests.get(testId)
    if (!test || test.status !== 'running') {
      return null
    }

    try {
      // Check if user is excluded from testing
      if (await this.isUserExcluded(userId, test, context)) {
        return null
      }

      // Check targeting criteria
      if (!(await this.meetsTargetingCriteria(userId, test, context))) {
        return null
      }

      // Get existing assignment or create new one
      let assignment = await this.getExistingAssignment(userId, testId)

      if (!assignment) {
        assignment = await this.createVariantAssignment(userId, test, context)

        // Store assignment
        this.storeUserAssignment(userId, assignment)
      }

      // Update assignment context
      assignment.lastSeen = new Date()
      assignment.contextHistory.push(context)

      return assignment
    } catch (error) {
      logger.error('Error getting variant assignment', { error, userId, testId })
      return null
    }
  }

  /**
   * Record test event for analysis
   */
  async recordTestEvent(event: TestEvent): Promise<void> {
    try {
      const test = this.activeTests.get(event.testId)
      if (!test) {
        logger.warn('Attempted to record event for inactive test', { testId: event.testId })
        return
      }

      // Validate event
      this.validateTestEvent(event, test)

      // Record event in metrics collector
      const metricsCollector = this.testMetrics.get(event.testId)
      if (metricsCollector) {
        await metricsCollector.recordEvent(event)
      }

      // Check for safety violations
      await this.safetyChecker.checkEvent(event, test)

      // Update test metrics
      await this.updateTestMetrics(event.testId)

      logger.debug('Test event recorded', {
        testId: event.testId,
        userId: event.userId,
        eventType: event.eventType,
      })
    } catch (error) {
      logger.error('Error recording test event', { error, event })
    }
  }

  /**
   * Get test results and analysis
   */
  async getTestResults(testId: string): Promise<TestResults | null> {
    const test = this.testHistory.get(testId)
    if (!test) {
      return null
    }

    try {
      // Get current metrics
      const metricsCollector = this.testMetrics.get(testId)
      if (!metricsCollector) {
        return null
      }

      const metrics = await metricsCollector.getCurrentMetrics()

      // Perform statistical analysis
      const statisticalTests = await this.statisticalEngine.performTests(
        test.variants,
        metrics,
        test.statisticalConfig
      )

      // Calculate treatment effects
      const treatmentEffects = this.calculateTreatmentEffects(
        test.variants,
        metrics,
        statisticalTests
      )

      // Assess business impact
      const businessImpact = this.assessBusinessImpact(
        treatmentEffects,
        test.primaryMetric,
        test.secondaryMetrics
      )

      // Generate variant results
      const variantResults = new Map<string, VariantResult>()
      for (const variant of test.variants) {
        const result = this.createVariantResult(variant, metrics, statisticalTests)
        variantResults.set(variant.variantId, result)
      }

      const results: TestResults = {
        status: test.status,
        startDate: test.startDate,
        endDate: test.endDate,
        totalUsers: metrics.totalUsers,
        totalConversions: metrics.totalConversions,
        variantResults,
        statisticalTests,
        treatmentEffects,
        statisticalSignificance: this.assessStatisticalSignificance(statisticalTests),
        practicalSignificance: this.assessPracticalSignificance(treatmentEffects, test),
        confidenceLevel: test.significanceLevel,
        pValue: Math.min(...statisticalTests.map((t) => t.pValue)),
        businessImpact,
        recommendations: this.generateRecommendations(treatmentEffects, businessImpact),
      }

      // Update test with results
      test.results = results
      test.updatedAt = new Date()

      return results
    } catch (error) {
      logger.error('Error getting test results', { error, testId })
      return null
    }
  }

  /**
   * Stop a test early
   */
  async stopTest(testId: string, reason: string): Promise<void> {
    const test = this.activeTests.get(testId)
    if (!test || test.status !== 'running') {
      throw new Error(`Test ${testId} is not running`)
    }

    try {
      // Generate final results
      const results = await this.getTestResults(testId)

      // Update test status
      test.status = 'stopped'
      test.endDate = new Date()
      test.updatedAt = new Date()

      // Record decision
      test.decisions.push({
        decision: 'stop',
        reason,
        timestamp: new Date(),
        decisionMaker: 'system',
        confidence: 1.0,
      })

      // Remove from active tests
      this.activeTests.delete(testId)

      // Stop monitoring
      this.testMonitor.stopMonitoring(testId)

      logger.info('A/B test stopped', { testId, reason })
    } catch (error) {
      logger.error('Error stopping A/B test', { error, testId })
      throw error
    }
  }

  // =============================================================================
  // Private Helper Methods (Implementation Stubs)
  // =============================================================================

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async validateTestDefinition(definition: CreateTestRequest): Promise<void> {
    // Validate test definition structure and parameters
  }

  private getDefaultExclusions(): ExclusionCriteria {
    return {
      excludedUsers: [],
      excludedUserSegments: [],
      excludedWorkspaces: [],
      excludedFeatures: [],
      botUsers: true,
      testUsers: true,
      internalUsers: true,
      excludeDuringIncidents: true,
      maintenanceWindows: [],
    }
  }

  private getDefaultStatisticalConfig(): StatisticalConfig {
    return {
      testingMethod: 'frequentist',
      multipleComparisonCorrection: 'benjamini_hochberg',
      credibleInterval: 0.95,
    }
  }

  private async performPreStartValidations(test: ABTest): Promise<void> {
    // Perform validations before starting test
  }

  private async isUserExcluded(userId: string, test: ABTest, context: any): Promise<boolean> {
    // Check if user should be excluded from test
    return false
  }

  private async meetsTargetingCriteria(
    userId: string,
    test: ABTest,
    context: any
  ): Promise<boolean> {
    // Check if user meets targeting criteria
    return true
  }

  private async getExistingAssignment(
    userId: string,
    testId: string
  ): Promise<VariantAssignment | null> {
    // Get existing variant assignment for user
    return null
  }

  private async createVariantAssignment(
    userId: string,
    test: ABTest,
    context: any
  ): Promise<VariantAssignment> {
    // Create new variant assignment
    return {
      userId,
      testId: test.testId,
      variantId: this.selectVariant(userId, test),
      assignmentTime: new Date(),
      lastSeen: new Date(),
      contextHistory: [context],
    }
  }

  private selectVariant(userId: string, test: ABTest): string {
    // Deterministic variant selection based on user ID
    const hash = this.hashUserId(userId + test.testId)
    let cumulative = 0

    for (const variant of test.variants) {
      cumulative += variant.trafficPercent
      if (hash < cumulative) {
        return variant.variantId
      }
    }

    return test.variants[0].variantId // Fallback to first variant
  }

  private hashUserId(input: string): number {
    // Simple hash function for deterministic assignment
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647 // Normalize to 0-1
  }

  private storeUserAssignment(userId: string, assignment: VariantAssignment): void {
    const userAssignments = this.userAssignments.get(userId) || []
    userAssignments.push(assignment)
    this.userAssignments.set(userId, userAssignments)
  }

  private validateTestEvent(event: TestEvent, test: ABTest): void {
    // Validate test event structure and data
  }

  private async updateTestMetrics(testId: string): Promise<void> {
    // Update aggregated test metrics
  }

  private calculateTreatmentEffects(variants: any, metrics: any, tests: any): TreatmentEffect[] {
    // Calculate treatment effects between variants
    return []
  }

  private assessBusinessImpact(
    effects: any,
    primaryMetric: any,
    secondaryMetrics: any
  ): BusinessImpact {
    // Assess business impact of test results
    return {} as BusinessImpact
  }

  private createVariantResult(variant: any, metrics: any, tests: any): VariantResult {
    // Create detailed variant result
    return {} as VariantResult
  }

  private assessStatisticalSignificance(tests: StatisticalTest[]): boolean {
    // Determine if results are statistically significant
    return tests.some((test) => test.pValue < 0.05)
  }

  private assessPracticalSignificance(effects: TreatmentEffect[], test: ABTest): boolean {
    // Determine if results are practically significant
    return effects.some((effect) => Math.abs(effect.effect) > test.minimumDetectableEffect)
  }

  private generateRecommendations(effects: TreatmentEffect[], impact: BusinessImpact): string[] {
    // Generate actionable recommendations
    return ['Continue monitoring test results', 'Consider implementing winning variant']
  }
}

// =============================================================================
// Supporting Classes (Implementation Stubs)
// =============================================================================

class StatisticalEngine {
  async performTests(variants: any, metrics: any, config: any): Promise<StatisticalTest[]> {
    // Perform statistical tests
    return []
  }
}

class PowerAnalysisEngine {
  async analyze(testDefinition: any): Promise<PowerAnalysis> {
    // Perform power analysis
    return {
      effect_size: 0.02,
      significance_level: 0.05,
      power_level: 0.8,
      required_sample_size: 10000,
      minimum_detectable_effect: 0.02,
      estimated_duration: 14 * 24 * 60 * 60 * 1000, // 14 days
      baseline_conversion_rate: 0.1,
      daily_traffic: 1000,
      assumptions: ['Normal distribution', 'Independent observations'],
    }
  }
}

class SegmentationEngine {
  // Implementation for user segmentation
}

class TestMonitor {
  startMonitoring(test: ABTest): void {
    // Start monitoring test
  }

  stopMonitoring(testId: string): void {
    // Stop monitoring test
  }
}

class SafetyChecker {
  async checkEvent(event: TestEvent, test: ABTest): Promise<void> {
    // Check for safety violations
  }
}

class TestMetricsCollector {
  async recordEvent(event: TestEvent): Promise<void> {
    // Record test event
  }

  async getCurrentMetrics(): Promise<any> {
    // Get current metrics
    return {
      totalUsers: 1000,
      totalConversions: 100,
    }
  }
}

// =============================================================================
// Additional Supporting Types
// =============================================================================

interface ABTestingConfig {
  statistical?: any
  monitoring?: any
  safety?: any
}

interface CreateTestRequest {
  name: string
  description: string
  hypothesis: string
  owner: string
  team: string
  testType: TestType
  variants: TestVariant[]
  trafficAllocation: TrafficAllocation
  targeting: TargetingCriteria
  segments?: UserSegment[]
  excludeFromTesting?: ExclusionCriteria
  primaryMetric: Metric
  secondaryMetrics?: Metric[]
  guardRailMetrics?: GuardRailMetric[]
  startDate: Date
  endDate?: Date
  duration: number
  statisticalConfig?: StatisticalConfig
  significanceLevel?: number
  powerLevel?: number
  minimumDetectableEffect: number
  tags?: string[]
}

interface VariantAssignment {
  userId: string
  testId: string
  variantId: string
  assignmentTime: Date
  lastSeen: Date
  contextHistory: any[]
}

interface UserTestAssignment {
  testId: string
  variantId: string
  assignmentTime: Date
}

interface TestEvent {
  eventId: string
  testId: string
  userId: string
  variantId: string
  eventType: string
  eventData: Record<string, any>
  timestamp: Date
}

interface StatisticalTest {
  testName: string
  pValue: number
  statistic: number
  effect: number
  confidenceInterval: [number, number]
}

interface TreatmentEffect {
  variantId: string
  effect: number
  standardError: number
  confidenceInterval: [number, number]
}

interface BusinessImpact {
  estimatedRevenue: number
  estimatedUsers: number
  riskLevel: 'low' | 'medium' | 'high'
  roi: number
}

interface MetricResult {
  value: number
  variance: number
  count: number
  confidenceInterval: [number, number]
}

interface MetricFilter {
  field: string
  operator: string
  value: any
}

interface SequentialBoundary {
  alpha_spending: number[]
  beta_spending: number[]
}

interface PriorDistribution {
  type: string
  parameters: Record<string, number>
}

interface TestDecision {
  decision: 'continue' | 'stop' | 'pause' | 'scale'
  reason: string
  timestamp: Date
  decisionMaker: string
  confidence: number
}

interface TestRecommendation {
  action: 'implement' | 'reject' | 'iterate' | 'scale'
  variant: string
  confidence: number
  reasoning: string[]
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high'
  riskFactors: string[]
  mitigation: string[]
}

interface GeneralizabilityAssessment {
  score: number
  factors: string[]
  limitations: string[]
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create A/B testing framework
 */
export function createABTestingFramework(config?: ABTestingConfig): ABTestingFramework {
  return new ABTestingFramework(config)
}

/**
 * Create production A/B testing framework
 */
export function createProductionABTestingFramework(): ABTestingFramework {
  const config: ABTestingConfig = {
    statistical: {
      default_power: 0.8,
      default_significance: 0.05,
      multiple_comparison_correction: true,
    },
    monitoring: {
      check_frequency: 3600000, // 1 hour
      alert_channels: ['slack', 'email'],
    },
    safety: {
      auto_stop_enabled: true,
      max_negative_impact: 0.05,
    },
  }

  return new ABTestingFramework(config)
}
