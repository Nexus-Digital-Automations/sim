/**
 * Monitoring and Analytics Types
 * Comprehensive type definitions for the Sim workflow monitoring system
 */

import type { ExecutionTrigger } from '@/lib/logs/types'

export interface LiveExecutionStatus {
  executionId: string
  workflowId: string
  workflowName: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number // 0-100 percentage
  currentBlock?: {
    blockId: string
    blockName: string
    blockType: string
    startedAt: string
  }
  startedAt: string
  estimatedCompletion?: string
  trigger: ExecutionTrigger['type']
  userId: string
  workspaceId: string
}

export interface ExecutionUpdate {
  type:
    | 'execution_started'
    | 'execution_completed'
    | 'execution_failed'
    | 'block_started'
    | 'block_completed'
    | 'block_failed'
    | 'execution_progress'
  executionId: string
  workflowId: string
  timestamp: string
  data: any
}

export interface PerformanceMetrics {
  executionId: string
  workflowId: string
  blockId?: string
  metrics: {
    executionTime: number // milliseconds
    resourceUsage: {
      cpu: number // percentage
      memory: number // bytes
      network: number // bytes
    }
    throughput?: number // operations per second
    latency?: number // milliseconds
    errorRate?: number // percentage
  }
  timestamp: string
}

export interface BlockMetrics {
  blockId: string
  blockName: string
  blockType: string
  executionTime: number
  resourceUsage: {
    cpu: number
    memory: number
    network: number
  }
  inputSize: number
  outputSize: number
  errorCount: number
  successCount: number
  costMetrics?: {
    tokens: number
    cost: number
    model?: string
  }
}

export interface BottleneckAnalysis {
  type: 'slow_block' | 'resource_constraint' | 'dependency_wait' | 'external_api'
  blockId: string
  blockName: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: number // milliseconds of delay
  recommendation: string
  details: Record<string, unknown>
}

export interface AlertRule {
  id: string
  name: string
  description?: string
  workspaceId: string
  workflowIds?: string[] // If empty, applies to all workflows
  folderIds?: string[] // If empty, applies to all folders
  enabled: boolean
  conditions: AlertCondition[]
  actions: AlertAction[]
  escalationPolicy?: EscalationPolicy
  cooldownPeriod: number // minutes
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface AlertCondition {
  id: string
  type:
    | 'execution_duration'
    | 'failure_rate'
    | 'cost_threshold'
    | 'resource_usage'
    | 'error_count'
    | 'throughput'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains'
  value: number | string
  timeWindow: string // e.g., '5m', '1h', '1d'
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count'
}

export interface AlertAction {
  id: string
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'dashboard_notification'
  configuration: {
    email?: {
      to: string[]
      subject?: string
      template?: string
    }
    slack?: {
      webhookUrl: string
      channel?: string
      username?: string
      iconEmoji?: string
    }
    webhook?: {
      url: string
      method: 'POST' | 'PUT' | 'PATCH'
      headers?: Record<string, string>
      body?: string
      retries?: number
      timeout?: number
    }
    sms?: {
      phoneNumbers: string[]
      message?: string
    }
    dashboard?: {
      priority: 'low' | 'medium' | 'high' | 'critical'
      autoResolve: boolean
      category: string
    }
  }
  enabled: boolean
}

export interface EscalationPolicy {
  id: string
  name: string
  levels: EscalationLevel[]
}

export interface EscalationLevel {
  levelNumber: number
  delayMinutes: number
  actions: AlertAction[]
  condition: 'alert_not_acknowledged' | 'alert_not_resolved' | 'always'
}

export interface AlertInstance {
  id: string
  ruleId: string
  ruleName: string
  workflowId?: string
  executionId?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved' | 'silenced'
  triggeredAt: string
  resolvedAt?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
  message: string
  details: Record<string, unknown>
  escalationLevel: number
  notificationsSent: NotificationRecord[]
}

export interface NotificationRecord {
  id: string
  actionId: string
  actionType: AlertAction['type']
  sentAt: string
  status: 'sent' | 'failed' | 'delivered' | 'bounced'
  details?: Record<string, unknown>
  error?: string
}

export interface WorkflowAnalytics {
  workflowId: string
  workflowName: string
  timeRange: TimeRange
  executionMetrics: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    successRate: number
    averageExecutionTime: number
    medianExecutionTime: number
    p95ExecutionTime: number
    p99ExecutionTime: number
  }
  costMetrics: {
    totalCost: number
    averageCostPerExecution: number
    costTrends: CostTrend[]
    tokenUsage: {
      total: number
      average: number
      trends: TokenTrend[]
    }
  }
  performanceMetrics: {
    throughput: ThroughputMetrics
    resourceUtilization: ResourceUtilizationMetrics
    bottlenecks: BottleneckAnalysis[]
  }
  errorAnalysis: {
    mostCommonErrors: ErrorPattern[]
    errorTrends: ErrorTrend[]
    mttr: number // mean time to resolution
    mtbf: number // mean time between failures
  }
  blockPerformance: BlockPerformanceAnalytics[]
}

export interface TimeRange {
  start: string
  end: string
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month'
}

export interface CostTrend {
  timestamp: string
  cost: number
  tokens: number
  executionCount: number
}

export interface TokenTrend {
  timestamp: string
  tokens: number
  executionCount: number
}

export interface ThroughputMetrics {
  executionsPerHour: number[]
  timestamps: string[]
  peakThroughput: number
  averageThroughput: number
}

export interface ResourceUtilizationMetrics {
  cpu: MetricSeries
  memory: MetricSeries
  network: MetricSeries
  storage: MetricSeries
}

export interface MetricSeries {
  timestamps: string[]
  values: number[]
  unit: string
  average: number
  peak: number
}

export interface ErrorPattern {
  error: string
  count: number
  percentage: number
  affectedBlocks: string[]
  lastOccurrence: string
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface ErrorTrend {
  timestamp: string
  errorCount: number
  executionCount: number
  errorRate: number
}

export interface BlockPerformanceAnalytics {
  blockId: string
  blockName: string
  blockType: string
  executionCount: number
  averageExecutionTime: number
  medianExecutionTime: number
  p95ExecutionTime: number
  successRate: number
  costPerExecution: number
  resourceUtilization: {
    cpu: number
    memory: number
    network: number
  }
  trends: BlockPerformanceTrend[]
}

export interface BlockPerformanceTrend {
  timestamp: string
  executionTime: number
  successRate: number
  cost: number
}

export interface BusinessMetrics {
  timeRange: TimeRange
  workspaceMetrics: {
    totalWorkflows: number
    activeWorkflows: number
    totalExecutions: number
    successfulExecutions: number
    totalUsers: number
    activeUsers: number
  }
  usageMetrics: {
    executionVolume: VolumeMetrics
    userEngagement: EngagementMetrics
    costEfficiency: CostAnalytics
    systemReliability: ReliabilityMetrics
  }
  growthMetrics: {
    newWorkflows: GrowthTrend[]
    newExecutions: GrowthTrend[]
    newUsers: GrowthTrend[]
    retentionRate: number
  }
}

export interface VolumeMetrics {
  daily: MetricSeries
  weekly: MetricSeries
  monthly: MetricSeries
  peakConcurrency: number
  averageConcurrency: number
}

export interface EngagementMetrics {
  dailyActiveUsers: MetricSeries
  averageSessionDuration: MetricSeries
  workflowsPerUser: MetricSeries
  executionsPerUser: MetricSeries
}

export interface CostAnalytics {
  costPerExecution: MetricSeries
  costPerUser: MetricSeries
  costEfficiencyScore: number
  topCostDrivers: CostDriver[]
}

export interface CostDriver {
  category: 'workflow' | 'block_type' | 'model' | 'integration'
  name: string
  cost: number
  percentage: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface ReliabilityMetrics {
  uptime: number // percentage
  errorRate: MetricSeries
  mttr: MetricSeries // mean time to resolution
  mtbf: MetricSeries // mean time between failures
  slaCompliance: number // percentage
}

export interface GrowthTrend {
  timestamp: string
  value: number
  growthRate: number
}

export interface DebugSession {
  id: string
  executionId: string
  workflowId: string
  userId: string
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  completedAt?: string
  breakpoints: Breakpoint[]
  variableInspections: VariableInspection[]
  executionSteps: ExecutionStep[]
}

export interface Breakpoint {
  id: string
  blockId: string
  blockName: string
  condition?: string // Optional condition for conditional breakpoints
  enabled: boolean
  hitCount: number
}

export interface VariableInspection {
  id: string
  blockId: string
  variableName: string
  value: unknown
  type: string
  timestamp: string
  stackTrace?: string[]
}

export interface ExecutionStep {
  id: string
  blockId: string
  blockName: string
  blockType: string
  action: 'enter' | 'execute' | 'output' | 'error' | 'exit'
  timestamp: string
  data?: unknown
  duration?: number
}

export interface ExecutionReplayOptions {
  executionId: string
  startFromBlockId?: string
  endAtBlockId?: string
  modifiedInputs?: Record<string, unknown>
  skipBlocks?: string[]
  debugMode: boolean
}

export interface ReplayResult {
  replayId: string
  originalExecutionId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  differences: ExecutionDifference[]
  newExecutionId?: string
}

export interface ExecutionDifference {
  blockId: string
  blockName: string
  type: 'input_changed' | 'output_changed' | 'execution_time_changed' | 'error_status_changed'
  original: unknown
  replay: unknown
  impact: 'none' | 'low' | 'medium' | 'high'
}

export interface MonitoringDashboardConfig {
  id: string
  name: string
  workspaceId: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
  filters: DashboardFilters
  refreshInterval: number // seconds
  isPublic: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface DashboardLayout {
  columns: number
  rows: number
  widgets: WidgetPosition[]
}

export interface WidgetPosition {
  widgetId: string
  x: number
  y: number
  width: number
  height: number
}

export interface DashboardWidget {
  id: string
  type:
    | 'execution_timeline'
    | 'performance_chart'
    | 'cost_metrics'
    | 'alert_status'
    | 'workflow_health'
    | 'resource_usage'
    | 'error_log'
    | 'throughput_gauge'
  title: string
  configuration: Record<string, unknown>
  dataSource: WidgetDataSource
  refreshInterval?: number
}

export interface WidgetDataSource {
  type: 'real_time' | 'historical' | 'aggregated'
  query: string
  parameters?: Record<string, unknown>
  timeRange?: TimeRange
}

export interface DashboardFilters {
  workflowIds?: string[]
  folderIds?: string[]
  timeRange?: TimeRange
  triggers?: ExecutionTrigger['type'][]
  status?: LiveExecutionStatus['status'][]
}

// API Response types
export interface MonitoringApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface LiveExecutionsResponse {
  executions: LiveExecutionStatus[]
  total: number
  workspaceStats: {
    running: number
    queued: number
    completed: number
    failed: number
  }
}

export interface PerformanceMetricsResponse {
  metrics: PerformanceMetrics[]
  aggregation: {
    averageExecutionTime: number
    totalExecutions: number
    successRate: number
    resourceUtilization: ResourceUtilizationMetrics
  }
}

// Event types for real-time updates
export interface MonitoringEvent {
  type: string
  source: 'execution' | 'alert' | 'performance' | 'system'
  timestamp: string
  data: unknown
}

export interface ExecutionEvent extends MonitoringEvent {
  source: 'execution'
  executionId: string
  workflowId: string
  data: ExecutionUpdate
}

export interface AlertEvent extends MonitoringEvent {
  source: 'alert'
  alertId: string
  ruleId: string
  data: AlertInstance
}

export interface PerformanceEvent extends MonitoringEvent {
  source: 'performance'
  executionId?: string
  workflowId?: string
  data: PerformanceMetrics
}

// Service interfaces
export interface ILiveExecutionMonitor {
  subscribeToWorkflowExecution(executionId: string): Promise<AsyncIterator<ExecutionUpdate>>
  subscribeToWorkspaceExecutions(workspaceId: string): Promise<AsyncIterator<ExecutionUpdate[]>>
  getActiveExecutions(workspaceId: string): Promise<LiveExecutionStatus[]>
  updateExecutionStatus(executionId: string, status: Partial<LiveExecutionStatus>): Promise<void>
}

export interface IPerformanceCollector {
  collectMetrics(
    executionId: string,
    blockId: string,
    metrics: Partial<PerformanceMetrics>
  ): Promise<void>
  getMetrics(query: MetricsQuery): Promise<PerformanceMetrics[]>
  analyzeBottlenecks(workflowId: string, timeRange: TimeRange): Promise<BottleneckAnalysis[]>
}

export interface IAlertEngine {
  evaluateRules(executionId: string, metrics: PerformanceMetrics): Promise<void>
  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule>
  updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule>
  deleteRule(ruleId: string): Promise<void>
  getActiveAlerts(workspaceId: string): Promise<AlertInstance[]>
  acknowledgeAlert(alertId: string, userId: string): Promise<void>
  resolveAlert(alertId: string, userId: string): Promise<void>
}

export interface IAnalyticsService {
  getWorkflowAnalytics(workflowId: string, timeRange: TimeRange): Promise<WorkflowAnalytics>
  getBusinessMetrics(workspaceId: string, timeRange: TimeRange): Promise<BusinessMetrics>
  generateReport(reportType: string, parameters: Record<string, unknown>): Promise<unknown>
}

export interface IDebugService {
  createDebugSession(executionId: string, userId: string): Promise<DebugSession>
  addBreakpoint(
    sessionId: string,
    breakpoint: Omit<Breakpoint, 'id' | 'hitCount'>
  ): Promise<Breakpoint>
  inspectVariable(
    sessionId: string,
    blockId: string,
    variableName: string
  ): Promise<VariableInspection>
  replayExecution(options: ExecutionReplayOptions): Promise<ReplayResult>
  getExecutionTimeline(executionId: string): Promise<ExecutionStep[]>
}

export interface MetricsQuery {
  workflowIds?: string[]
  executionIds?: string[]
  blockIds?: string[]
  timeRange: TimeRange
  aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count'
  groupBy?: ('workflow' | 'block' | 'hour' | 'day')[]
}
