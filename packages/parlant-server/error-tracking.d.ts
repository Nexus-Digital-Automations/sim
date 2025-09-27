/**
 * Parlant Server Error Tracking and Alerting System
 *
 * This module provides comprehensive error tracking, categorization, and alerting
 * capabilities for the Parlant server integration with real-time monitoring and reporting.
 */
import { type ParlantLogContext } from "./logging";
export interface ErrorDetails {
  id: string;
  timestamp: string;
  level: "warning" | "error" | "critical";
  category:
    | "system"
    | "database"
    | "authentication"
    | "integration"
    | "agent"
    | "user";
  service: string;
  operation?: string;
  message: string;
  stack?: string;
  context: ParlantLogContext;
  metadata: {
    userAgent?: string;
    requestId?: string;
    userId?: string;
    workspaceId?: string;
    agentId?: string;
    sessionId?: string;
    errorCode?: string;
    httpStatus?: number;
    responseTime?: number;
    retryCount?: number;
    nodeVersion?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    [key: string]: any;
  };
}
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    errorLevel?: ("warning" | "error" | "critical")[];
    categories?: string[];
    services?: string[];
    operations?: string[];
    frequency?: {
      count: number;
      timeWindowMinutes: number;
    };
    threshold?: {
      errorRate?: number;
      responseTime?: number;
    };
  };
  actions: {
    log?: boolean;
    notify?: boolean;
    webhook?: {
      url: string;
      method: "POST" | "GET";
      headers?: Record<string, string>;
    };
    email?: {
      recipients: string[];
      subject: string;
    };
  };
  cooldownMinutes?: number;
}
export interface AlertInstance {
  id: string;
  ruleId: string;
  timestamp: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  errors: ErrorDetails[];
  resolved: boolean;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}
/**
 * Default alert rules for common error scenarios
 */
export declare const DEFAULT_ALERT_RULES: AlertRule[];
/**
 * Parlant Error Tracking Service
 */
export declare class ParlantErrorTracker {
  private errors;
  private alerts;
  private alertRules;
  private maxErrorHistory;
  private maxAlertHistory;
  private alertCooldowns;
  constructor(alertRules?: AlertRule[]);
  /**
   * Track an error with comprehensive context
   */
  trackError(
    level: ErrorDetails["level"],
    category: ErrorDetails["category"],
    service: string,
    message: string,
    error?: Error,
    context?: ParlantLogContext,
    metadata?: Partial<ErrorDetails["metadata"]>,
  ): Promise<string>;
  /**
   * Evaluate alert rules against the current error
   */
  private evaluateAlertRules;
  /**
   * Check if an error matches an alert rule
   */
  private doesErrorMatchRule;
  /**
   * Trigger an alert based on matching rule
   */
  private triggerAlert;
  /**
   * Generate alert message from rule and errors
   */
  private generateAlertMessage;
  /**
   * Determine alert severity from errors
   */
  private determineSeverity;
  /**
   * Execute alert actions
   */
  private executeAlertActions;
  /**
   * Execute webhook alert action
   */
  private executeWebhook;
  /**
   * Get recent errors within specified minutes
   */
  getRecentErrors(minutes?: number): ErrorDetails[];
  /**
   * Get error statistics for a time window
   */
  getErrorStats(windowMinutes?: number): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    byService: Record<string, number>;
    topErrors: Array<{
      message: string;
      count: number;
    }>;
  };
  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertInstance[];
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean;
  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean;
  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[];
  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean;
}
/**
 * Singleton error tracker instance
 */
export declare const parlantErrorTracker: ParlantErrorTracker;
/**
 * Convenience functions for error tracking
 */
export declare const errorTracker: {
  trackWarning: (
    category: ErrorDetails["category"],
    service: string,
    message: string,
    error?: Error,
    context?: ParlantLogContext,
  ) => Promise<string>;
  trackError: (
    category: ErrorDetails["category"],
    service: string,
    message: string,
    error?: Error,
    context?: ParlantLogContext,
  ) => Promise<string>;
  trackCritical: (
    category: ErrorDetails["category"],
    service: string,
    message: string,
    error?: Error,
    context?: ParlantLogContext,
  ) => Promise<string>;
  getStats: (windowMinutes?: number) => {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    byService: Record<string, number>;
    topErrors: Array<{
      message: string;
      count: number;
    }>;
  };
  getActiveAlerts: () => AlertInstance[];
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => boolean;
  resolveAlert: (alertId: string) => boolean;
};
