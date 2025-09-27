/**
 * Intelligent Retry and Recovery Mechanisms
 *
 * This module provides comprehensive retry logic, circuit breakers, and adaptive recovery
 * strategies for the Universal Tool Adapter System. It includes exponential backoff,
 * jitter, failure pattern analysis, and automatic fallback mechanisms.
 */
import { ErrorCategory, RecoveryStrategy } from "./error-taxonomy";
import type { ParlantLogContext } from "./logging";
/**
 * Retry configuration for different scenarios
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableErrors: ErrorCategory[];
  retryableSubcategories: string[];
  circuitBreakerThreshold: number;
  circuitBreakerWindowMs: number;
  adaptiveAdjustment: boolean;
}
/**
 * Circuit breaker states
 */
export declare enum CircuitBreakerState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Failing fast
  HALF_OPEN = "half_open",
}
/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  failureCount: number;
  failureThreshold: number;
  lastFailureTime?: number;
  nextRetryTime?: number;
  successCount: number;
  halfOpenMaxAttempts: number;
}
/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  startTime: number;
  endTime?: number;
  delayMs: number;
  success: boolean;
  error?: Error;
  recoveryStrategy?: RecoveryStrategy;
}
/**
 * Recovery operation result
 */
export interface RecoveryResult {
  success: boolean;
  attempts: RetryAttempt[];
  totalTime: number;
  finalStrategy: RecoveryStrategy;
  circuitBreakerTriggered: boolean;
  fallbackUsed: boolean;
  adaptiveAdjustments: AdaptiveAdjustment[];
}
/**
 * Adaptive adjustment information
 */
export interface AdaptiveAdjustment {
  type:
    | "timeout_increase"
    | "retry_count_adjust"
    | "backoff_adjust"
    | "strategy_change";
  oldValue: any;
  newValue: any;
  reason: string;
  timestamp: number;
}
/**
 * Default retry configurations for different error categories
 */
export declare const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig>;
/**
 * Intelligent retry and recovery service
 */
export declare class ErrorRecoveryService {
  private circuitBreakers;
  private retryHistory;
  private adaptiveConfigs;
  private fallbackStrategies;
  constructor();
  /**
   * Execute operation with intelligent retry and recovery
   */
  executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      operationId: string;
      component: string;
      category?: ErrorCategory;
      subcategory?: string;
      toolName?: string;
      parlantContext?: ParlantLogContext;
    },
    customConfig?: Partial<RetryConfig>,
  ): Promise<T>;
  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay;
  /**
   * Determine if operation should be retried
   */
  private shouldRetry;
  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen;
  private shouldTriggerCircuitBreaker;
  private openCircuitBreaker;
  private setCircuitBreakerHalfOpen;
  private recordSuccess;
  private recordFailure;
  private getOrCreateCircuitBreaker;
  /**
   * Fallback strategy execution
   */
  private attemptFallback;
  /**
   * Adaptive configuration management
   */
  private updateAdaptiveConfig;
  /**
   * Get retry configuration for specific context
   */
  private getRetryConfig;
  /**
   * Initialize fallback strategies
   */
  private initializeFallbackStrategies;
  /**
   * Utility methods
   */
  private sleep;
  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(
    circuitKey?: string,
  ): Map<string, CircuitBreakerStatus> | CircuitBreakerStatus;
  /**
   * Reset circuit breaker (for manual intervention)
   */
  resetCircuitBreaker(circuitKey: string): boolean;
  /**
   * Get recovery statistics
   */
  getRecoveryStatistics(timeWindowMs?: number): {
    totalOperations: number;
    successfulOperations: number;
    retriedOperations: number;
    circuitBreakerTrips: number;
    avgAttemptsPerOperation: number;
    adaptiveAdjustments: number;
  };
}
/**
 * Singleton error recovery service
 */
export declare const errorRecoveryService: ErrorRecoveryService;
/**
 * Convenience function for executing operations with recovery
 */
export declare const executeWithRecovery: <T>(
  operation: () => Promise<T>,
  context: {
    operationId: string;
    component: string;
    category?: ErrorCategory;
    subcategory?: string;
    toolName?: string;
    parlantContext?: ParlantLogContext;
  },
  customConfig?: Partial<RetryConfig>,
) => Promise<T>;
/**
 * Decorator for automatic retry functionality
 */
export declare function WithRetry(
  component: string,
  category?: ErrorCategory,
  subcategory?: string,
  customConfig?: Partial<RetryConfig>,
): (
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;
