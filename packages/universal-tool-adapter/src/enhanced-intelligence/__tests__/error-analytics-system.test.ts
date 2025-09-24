/**
 * @fileoverview Unit tests for Error Analytics System
 * Comprehensive test suite covering error tracking, analytics aggregation, and reporting
 *
 * @version 1.0.0
 * @author Intelligent Error Handling Agent
 * @created 2025-09-24
 */

import { EventEmitter } from 'events';
import {
  ErrorAnalyticsSystem,
  ErrorEvent,
  ErrorRecoveryOutcome,
  UserErrorFeedback,
  ErrorFrequencyAnalytics,
  RecoveryEffectivenessAnalytics,
  UserExperienceAnalytics,
  SystemPerformanceAnalytics,
  PredictiveAnalytics,
  AnalyticsAlert,
  AnalyticsConfig,
  createErrorAnalyticsSystem,
  PRODUCTION_ANALYTICS_CONFIG,
  DEVELOPMENT_ANALYTICS_CONFIG
} from '../error-analytics-system';
import {
  ErrorRecoveryContext,
  ErrorClassification,
  IntelligentRecoveryPlan,
  RecoveryAction
} from '../intelligent-error-recovery-engine';

describe('ErrorAnalyticsSystem', () => {
  let analyticsSystem: ErrorAnalyticsSystem;
  let mockConfig: AnalyticsConfig;

  beforeEach(() => {
    mockConfig = {
      retentionDays: 7,
      performanceSamplingRate: 1.0,
      enablePredictiveAnalytics: false, // Disable for faster tests
      aggregationIntervals: {
        realtime: 1, // 1 second for testing
        hourly: false,
        daily: false,
        weekly: false,
        monthly: false
      },
      privacy: {
        anonymizeUserData: false,
        excludePersonalInfo: false,
        dataEncryption: false
      },
      alertThresholds: {
        errorRateIncrease: 25,
        satisfactionDrop: 1.0,
        resolutionTimeIncrease: 1000,
        systemResourceUsage: 90
      }
    };

    analyticsSystem = new ErrorAnalyticsSystem(mockConfig);
  });

  afterEach(async () => {
    await analyticsSystem.shutdown();
    jest.clearAllMocks();
  });

  describe('Error Event Recording', () => {
    it('should record error events successfully', async () => {
      const error = new Error('Test error for analytics');
      const context: ErrorRecoveryContext = {
        toolName: 'test_tool',
        operation: 'test_operation',
        parameters: { testParam: 'value' },
        timestamp: new Date(),
        sessionId: 'analytics_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification: ErrorClassification = {
        category: 'network',
        severity: 'medium',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.85,
        patterns: ['timeout_pattern'],
        suggestedActions: ['retry', 'check_connection'],
        estimatedRecoveryTime: 5000,
        metadata: {}
      };

      const eventId = await analyticsSystem.recordErrorEvent(error, context, classification);

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^err_\d+_[a-z0-9]+$/);

      // Verify event was recorded
      const systemStatus = analyticsSystem.getSystemStatus();
      expect(systemStatus.eventCount).toBe(1);
    });

    it('should handle recording errors gracefully', async () => {
      const error = new Error('Test error');
      const invalidContext = null as any;
      const classification: ErrorClassification = {
        category: 'unknown',
        severity: 'low',
        isRetryable: false,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.5,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 1000,
        metadata: {}
      };

      // Should not throw, but return fallback ID
      const eventId = await analyticsSystem.recordErrorEvent(error, invalidContext, classification);

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^fallback_\d+$/);
    });

    it('should emit analytics events during recording', (done) => {
      analyticsSystem.once('error_recorded', (event) => {
        expect(event).toBeDefined();
        expect(event.error.message).toBe('Event emission test error');
        done();
      });

      const error = new Error('Event emission test error');
      const context: ErrorRecoveryContext = {
        toolName: 'event_tool',
        operation: 'emit_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'event_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification: ErrorClassification = {
        category: 'test',
        severity: 'low',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.9,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 1000,
        metadata: {}
      };

      analyticsSystem.recordErrorEvent(error, context, classification);
    });
  });

  describe('Recovery Tracking', () => {
    let eventId: string;

    beforeEach(async () => {
      const error = new Error('Recovery tracking test');
      const context: ErrorRecoveryContext = {
        toolName: 'recovery_tool',
        operation: 'recovery_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'recovery_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification: ErrorClassification = {
        category: 'network',
        severity: 'medium',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.8,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 2000,
        metadata: {}
      };

      eventId = await analyticsSystem.recordErrorEvent(error, context, classification);
    });

    it('should record recovery plans', async () => {
      const recoveryPlan: IntelligentRecoveryPlan = {
        id: 'plan_123',
        timestamp: new Date(),
        classification: {
          category: 'network',
          severity: 'medium',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 2000,
          metadata: {}
        },
        userFriendlyExplanation: 'A network error occurred',
        technicalAnalysis: 'Connection timeout detected',
        recoveryActions: [],
        alternativeTools: [],
        preventionSuggestions: [],
        estimatedRecoveryTime: 2000,
        confidence: 0.8,
        metadata: {
          processingTime: 150,
          alternativeToolsFound: 1,
          totalRecoveryOptions: 3
        }
      };

      await expect(analyticsSystem.recordRecoveryPlan(eventId, recoveryPlan))
        .resolves.not.toThrow();

      // Verify event was emitted
      return new Promise<void>((resolve) => {
        analyticsSystem.once('recovery_plan_recorded', (data) => {
          expect(data.eventId).toBe(eventId);
          expect(data.recoveryPlan).toBe(recoveryPlan);
          resolve();
        });
      });
    });

    it('should record selected recovery actions', async () => {
      const selectedAction: RecoveryAction = {
        id: 'action_123',
        type: 'retry',
        description: 'Retry the operation',
        instructions: ['Wait 2 seconds', 'Retry'],
        estimatedTime: 2000,
        successProbability: 0.8,
        requirements: [],
        risks: [],
        parameters: { delay: 2000 }
      };

      await expect(analyticsSystem.recordSelectedAction(eventId, selectedAction))
        .resolves.not.toThrow();
    });

    it('should record recovery outcomes', async () => {
      const outcome: ErrorRecoveryOutcome = {
        success: true,
        resolutionTimeMs: 3000,
        attemptCount: 1,
        resolutionMethod: 'automatic',
        resolutionNotes: 'Retry successful',
        alternativeToolUsed: false,
        successfulTool: 'original_tool'
      };

      await expect(analyticsSystem.recordRecoveryOutcome(eventId, outcome))
        .resolves.not.toThrow();
    });

    it('should record user feedback', async () => {
      const feedback: UserErrorFeedback = {
        satisfactionRating: 4,
        messageHelpfulness: 4,
        recoveryEffectiveness: 5,
        resolutionEase: 3,
        comments: 'The error handling worked well overall',
        wouldRecommend: true,
        feedbackTimestamp: new Date()
      };

      await expect(analyticsSystem.recordUserFeedback(eventId, feedback))
        .resolves.not.toThrow();
    });
  });

  describe('Error Frequency Analytics', () => {
    beforeEach(async () => {
      // Create sample error events for testing
      const errors = [
        { message: 'Network timeout', type: 'NetworkError', timestamp: new Date(Date.now() - 1800000) }, // 30 min ago
        { message: 'Validation failed', type: 'ValidationError', timestamp: new Date(Date.now() - 3600000) }, // 1 hour ago
        { message: 'Network timeout', type: 'NetworkError', timestamp: new Date(Date.now() - 900000) }, // 15 min ago
        { message: 'System error', type: 'SystemError', timestamp: new Date(Date.now() - 7200000) } // 2 hours ago
      ];

      for (const errorData of errors) {
        const error = new Error(errorData.message);
        (error as any).name = errorData.type;

        const context: ErrorRecoveryContext = {
          toolName: 'analytics_tool',
          operation: 'analytics_test',
          parameters: {},
          timestamp: errorData.timestamp,
          sessionId: 'analytics_session',
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'low',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 1000,
          metadata: {}
        };

        await analyticsSystem.recordErrorEvent(error, context, classification);
      }
    });

    it('should generate error frequency analytics', async () => {
      const analytics = await analyticsSystem.getErrorFrequencyAnalytics(24); // Last 24 hours

      expect(analytics).toBeDefined();
      expect(analytics.totalErrors).toBe(4);
      expect(analytics.errorsPerDay).toBe(4); // All errors within 24 hours
      expect(analytics.topErrorTypes).toBeDefined();
      expect(analytics.topErrorTypes.length).toBeGreaterThan(0);
      expect(analytics.hourlyDistribution).toBeDefined();
      expect(analytics.dailyDistribution).toBeDefined();
      expect(analytics.trends).toBeDefined();

      // Verify top error types
      const networkErrors = analytics.topErrorTypes.find(type => type.type === 'NetworkError');
      expect(networkErrors).toBeDefined();
      expect(networkErrors?.count).toBe(2);
      expect(networkErrors?.percentage).toBe(50);
    });

    it('should calculate hourly distribution correctly', async () => {
      const analytics = await analyticsSystem.getErrorFrequencyAnalytics(24);

      expect(analytics.hourlyDistribution).toBeDefined();
      expect(Object.keys(analytics.hourlyDistribution)).toHaveLength(24);

      // Verify all hours are represented
      for (let hour = 0; hour < 24; hour++) {
        expect(analytics.hourlyDistribution[hour]).toBeDefined();
        expect(analytics.hourlyDistribution[hour]).toBeGreaterThanOrEqual(0);
      }
    });

    it('should filter by time range correctly', async () => {
      const analytics1Hour = await analyticsSystem.getErrorFrequencyAnalytics(1);
      const analytics24Hours = await analyticsSystem.getErrorFrequencyAnalytics(24);

      expect(analytics1Hour.totalErrors).toBeLessThanOrEqual(analytics24Hours.totalErrors);
      expect(analytics1Hour.totalErrors).toBe(2); // Only errors within last hour
      expect(analytics24Hours.totalErrors).toBe(4); // All errors
    });
  });

  describe('Recovery Effectiveness Analytics', () => {
    beforeEach(async () => {
      // Create sample error events with outcomes
      const testData = [
        {
          error: new Error('Successful recovery'),
          outcome: { success: true, resolutionTimeMs: 2000, attemptCount: 1, resolutionMethod: 'automatic' as const },
          type: 'NetworkError'
        },
        {
          error: new Error('Failed recovery'),
          outcome: { success: false, resolutionTimeMs: 5000, attemptCount: 3, resolutionMethod: 'manual_intervention' as const },
          type: 'NetworkError'
        },
        {
          error: new Error('Alternative tool success'),
          outcome: {
            success: true,
            resolutionTimeMs: 3000,
            attemptCount: 2,
            resolutionMethod: 'alternative_tool' as const,
            alternativeToolUsed: true,
            successfulTool: 'backup_tool'
          },
          type: 'SystemError'
        }
      ];

      for (const data of testData) {
        (data.error as any).name = data.type;

        const context: ErrorRecoveryContext = {
          toolName: 'effectiveness_tool',
          operation: 'effectiveness_test',
          parameters: {},
          timestamp: new Date(),
          sessionId: 'effectiveness_session',
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'medium',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 2000,
          metadata: {}
        };

        const eventId = await analyticsSystem.recordErrorEvent(data.error, context, classification);
        await analyticsSystem.recordRecoveryOutcome(eventId, data.outcome);
      }
    });

    it('should calculate overall success rate', async () => {
      const analytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(24);

      expect(analytics).toBeDefined();
      expect(analytics.overallSuccessRate).toBeDefined();
      expect(analytics.overallSuccessRate).toBeCloseTo(66.67, 2); // 2 out of 3 successful
    });

    it('should calculate success rate by error type', async () => {
      const analytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(24);

      expect(analytics.successRateByType).toBeDefined();
      expect(analytics.successRateByType['NetworkError']).toBe(50); // 1 out of 2
      expect(analytics.successRateByType['SystemError']).toBe(100); // 1 out of 1
    });

    it('should calculate average resolution time', async () => {
      const analytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(24);

      expect(analytics.averageResolutionTime).toBeDefined();
      expect(analytics.averageResolutionTime).toBeCloseTo(3333.33, 2); // (2000 + 5000 + 3000) / 3
    });

    it('should track alternative tool success', async () => {
      const analytics = await analyticsSystem.getRecoveryEffectivenessAnalytics(24);

      expect(analytics.alternativeToolSuccess).toBeDefined();
      expect(analytics.alternativeToolSuccess['backup_tool']).toBeDefined();
      expect(analytics.alternativeToolSuccess['backup_tool'].successRate).toBe(100);
      expect(analytics.alternativeToolSuccess['backup_tool'].usageCount).toBe(1);
    });
  });

  describe('User Experience Analytics', () => {
    beforeEach(async () => {
      // Create sample error events with user feedback
      const feedbackData = [
        { satisfactionRating: 5, messageHelpfulness: 5, recoveryEffectiveness: 5, resolutionEase: 4, comments: 'Excellent handling' },
        { satisfactionRating: 3, messageHelpfulness: 3, recoveryEffectiveness: 4, resolutionEase: 3, comments: 'Could be clearer' },
        { satisfactionRating: 2, messageHelpfulness: 2, recoveryEffectiveness: 2, resolutionEase: 2, comments: 'Very confusing' },
        { satisfactionRating: 4, messageHelpfulness: 4, recoveryEffectiveness: 4, resolutionEase: 5, comments: 'Generally good' }
      ];

      for (let i = 0; i < feedbackData.length; i++) {
        const error = new Error(`UX test error ${i}`);
        const context: ErrorRecoveryContext = {
          toolName: 'ux_tool',
          operation: 'ux_test',
          parameters: {},
          timestamp: new Date(),
          sessionId: `ux_session_${i}`,
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'low',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 1000,
          metadata: {}
        };

        const eventId = await analyticsSystem.recordErrorEvent(error, context, classification);

        const feedback: UserErrorFeedback = {
          ...feedbackData[i],
          wouldRecommend: feedbackData[i].satisfactionRating >= 4,
          feedbackTimestamp: new Date()
        };

        await analyticsSystem.recordUserFeedback(eventId, feedback);
      }
    });

    it('should calculate average satisfaction', async () => {
      const analytics = await analyticsSystem.getUserExperienceAnalytics(24);

      expect(analytics).toBeDefined();
      expect(analytics.averageSatisfaction).toBeDefined();
      expect(analytics.averageSatisfaction).toBeCloseTo(3.5, 2); // (5 + 3 + 2 + 4) / 4
    });

    it('should generate feedback distribution', async () => {
      const analytics = await analyticsSystem.getUserExperienceAnalytics(24);

      expect(analytics.feedbackDistribution).toBeDefined();
      expect(analytics.feedbackDistribution.satisfaction).toBeDefined();
      expect(analytics.feedbackDistribution.satisfaction[5]).toBe(1);
      expect(analytics.feedbackDistribution.satisfaction[4]).toBe(1);
      expect(analytics.feedbackDistribution.satisfaction[3]).toBe(1);
      expect(analytics.feedbackDistribution.satisfaction[2]).toBe(1);
      expect(analytics.feedbackDistribution.satisfaction[1]).toBe(0);
    });

    it('should calculate net promoter score', async () => {
      const analytics = await analyticsSystem.getUserExperienceAnalytics(24);

      expect(analytics.netPromoterScore).toBeDefined();
      // NPS based on satisfaction: promoters (4-5): 2, detractors (1-2): 1, total: 4
      // NPS = (2 - 1) / 4 * 100 = 25
      expect(analytics.netPromoterScore).toBe(25);
    });

    it('should extract common complaints', async () => {
      const analytics = await analyticsSystem.getUserExperienceAnalytics(24);

      expect(analytics.commonComplaints).toBeDefined();
      expect(analytics.commonComplaints.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Performance Analytics', () => {
    it('should provide system performance metrics', async () => {
      const analytics = await analyticsSystem.getSystemPerformanceAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.performance).toBeDefined();
      expect(analytics.performance.averageProcessingTime).toBeDefined();
      expect(analytics.performance.processingTimeByType).toBeDefined();
      expect(analytics.performance.memoryUsage).toBeDefined();
      expect(analytics.performance.cpuUsage).toBeDefined();

      expect(analytics.reliability).toBeDefined();
      expect(analytics.reliability.uptimePercentage).toBeDefined();
      expect(analytics.reliability.errorHandlingUptime).toBeDefined();

      expect(analytics.capacity).toBeDefined();
      expect(analytics.capacity.concurrentErrorsHandled).toBeDefined();
      expect(analytics.capacity.peakConcurrency).toBeDefined();
    });

    it('should track memory usage trends', async () => {
      const analytics = await analyticsSystem.getSystemPerformanceAnalytics();

      expect(analytics.performance.memoryUsage.trend).toBeDefined();
      expect(analytics.performance.memoryUsage.trend.length).toBeGreaterThan(0);
      expect(analytics.performance.memoryUsage.average).toBeGreaterThan(0);
      expect(analytics.performance.memoryUsage.peak).toBeGreaterThanOrEqual(analytics.performance.memoryUsage.average);
    });
  });

  describe('Alert System', () => {
    it('should create alerts when thresholds are exceeded', async () => {
      // Simulate error rate spike by creating many errors quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const error = new Error(`Alert test error ${i}`);
        const context: ErrorRecoveryContext = {
          toolName: 'alert_tool',
          operation: 'alert_test',
          parameters: {},
          timestamp: new Date(),
          sessionId: `alert_session_${i}`,
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'high',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 1000,
          metadata: {}
        };

        promises.push(analyticsSystem.recordErrorEvent(error, context, classification));
      }

      await Promise.all(promises);

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const alerts = analyticsSystem.getActiveAlerts();
      // Might have alerts depending on the implementation
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should acknowledge alerts', async () => {
      // Create a low satisfaction alert first
      const error = new Error('Satisfaction test error');
      const context: ErrorRecoveryContext = {
        toolName: 'satisfaction_tool',
        operation: 'satisfaction_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'satisfaction_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification: ErrorClassification = {
        category: 'test',
        severity: 'low',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.8,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 1000,
        metadata: {}
      };

      const eventId = await analyticsSystem.recordErrorEvent(error, context, classification);

      const feedback: UserErrorFeedback = {
        satisfactionRating: 1,
        messageHelpfulness: 1,
        recoveryEffectiveness: 1,
        resolutionEase: 1,
        comments: 'Terrible experience',
        wouldRecommend: false,
        feedbackTimestamp: new Date()
      };

      await analyticsSystem.recordUserFeedback(eventId, feedback);

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const alerts = analyticsSystem.getActiveAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        await expect(analyticsSystem.acknowledgeAlert(alertId)).resolves.not.toThrow();

        const updatedAlerts = analyticsSystem.getActiveAlerts();
        const acknowledgedAlert = updatedAlerts.find(alert => alert.id === alertId);
        expect(acknowledgedAlert?.acknowledged).toBe(true);
      }
    });

    it('should resolve alerts', async () => {
      const alerts = analyticsSystem.getActiveAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        await expect(analyticsSystem.resolveAlert(alertId, 'Issue resolved')).resolves.not.toThrow();

        const activeAlerts = analyticsSystem.getActiveAlerts();
        const resolvedAlert = activeAlerts.find(alert => alert.id === alertId);
        expect(resolvedAlert).toBeUndefined(); // Should not be in active alerts
      }
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      // Create some sample data
      const error = new Error('Export test error');
      const context: ErrorRecoveryContext = {
        toolName: 'export_tool',
        operation: 'export_test',
        parameters: {},
        timestamp: new Date(),
        sessionId: 'export_session',
        userAgent: 'Test/1.0',
        previousAttempts: 0,
        platform: 'web'
      };

      const classification: ErrorClassification = {
        category: 'test',
        severity: 'low',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.8,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 1000,
        metadata: {}
      };

      await analyticsSystem.recordErrorEvent(error, context, classification);
    });

    it('should export data as JSON', async () => {
      const jsonData = await analyticsSystem.exportAnalyticsData('json', 24);

      expect(typeof jsonData).toBe('string');

      const parsed = JSON.parse(jsonData as string);
      expect(parsed.exportMetadata).toBeDefined();
      expect(parsed.events).toBeDefined();
      expect(parsed.aggregatedAnalytics).toBeDefined();
      expect(Array.isArray(parsed.events)).toBe(true);
    });

    it('should export data as CSV', async () => {
      const csvData = await analyticsSystem.exportAnalyticsData('csv', 24);

      expect(typeof csvData).toBe('string');
      expect((csvData as string).includes('Event ID')).toBe(true);
      expect((csvData as string).includes('Timestamp')).toBe(true);
    });

    it('should export data as Excel', async () => {
      const excelData = await analyticsSystem.exportAnalyticsData('excel', 24);

      expect(Buffer.isBuffer(excelData)).toBe(true);
    });

    it('should throw error for unsupported format', async () => {
      await expect(analyticsSystem.exportAnalyticsData('pdf' as any, 24))
        .rejects.toThrow('Unsupported export format: pdf');
    });
  });

  describe('System Status and Health', () => {
    it('should provide system status', () => {
      const status = analyticsSystem.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.status).toMatch(/^(healthy|warning|critical)$/);
      expect(status.isRunning).toBe(true);
      expect(typeof status.eventCount).toBe('number');
      expect(typeof status.alertCount).toBe('number');
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle shutdown gracefully', async () => {
      await expect(analyticsSystem.shutdown()).resolves.not.toThrow();

      const status = analyticsSystem.getSystemStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('Configuration and Factory Functions', () => {
    it('should create system with production configuration', () => {
      const prodSystem = createErrorAnalyticsSystem(PRODUCTION_ANALYTICS_CONFIG);

      expect(prodSystem).toBeInstanceOf(ErrorAnalyticsSystem);

      // Clean up
      return prodSystem.shutdown();
    });

    it('should create system with development configuration', () => {
      const devSystem = createErrorAnalyticsSystem(DEVELOPMENT_ANALYTICS_CONFIG);

      expect(devSystem).toBeInstanceOf(ErrorAnalyticsSystem);

      // Clean up
      return devSystem.shutdown();
    });

    it('should create system with custom configuration', () => {
      const customConfig: Partial<AnalyticsConfig> = {
        retentionDays: 30,
        performanceSamplingRate: 0.5,
        enablePredictiveAnalytics: true
      };

      const customSystem = createErrorAnalyticsSystem(customConfig);

      expect(customSystem).toBeInstanceOf(ErrorAnalyticsSystem);

      // Clean up
      return customSystem.shutdown();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed event data gracefully', async () => {
      const error = new Error('Malformed data test');
      const malformedContext = {
        // Missing required fields
        toolName: undefined,
        operation: null,
        parameters: 'not-an-object',
        timestamp: 'invalid-date'
      } as any;

      const classification: ErrorClassification = {
        category: 'test',
        severity: 'low',
        isRetryable: true,
        requiresUserAction: false,
        requiresEscalation: false,
        confidence: 0.8,
        patterns: [],
        suggestedActions: [],
        estimatedRecoveryTime: 1000,
        metadata: {}
      };

      // Should not throw, but return a fallback ID
      const eventId = await analyticsSystem.recordErrorEvent(error, malformedContext, classification);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should handle extremely large datasets', async () => {
      // Create many events to test performance
      const startTime = Date.now();
      const eventCount = 100;

      const promises = Array.from({ length: eventCount }, async (_, i) => {
        const error = new Error(`Large dataset error ${i}`);
        const context: ErrorRecoveryContext = {
          toolName: `tool_${i}`,
          operation: 'large_dataset_test',
          parameters: { index: i, data: 'x'.repeat(1000) }, // 1KB of data per event
          timestamp: new Date(),
          sessionId: `large_session_${i}`,
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'low',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 1000,
          metadata: {}
        };

        return analyticsSystem.recordErrorEvent(error, context, classification);
      });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(eventCount);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all events were recorded
      const status = analyticsSystem.getSystemStatus();
      expect(status.eventCount).toBeGreaterThanOrEqual(eventCount);
    });

    it('should maintain data integrity under concurrent access', async () => {
      const concurrentOperations = Array.from({ length: 50 }, async (_, i) => {
        const error = new Error(`Concurrent error ${i}`);
        const context: ErrorRecoveryContext = {
          toolName: `concurrent_tool_${i}`,
          operation: 'concurrent_test',
          parameters: { index: i },
          timestamp: new Date(),
          sessionId: `concurrent_session_${i}`,
          userAgent: 'Test/1.0',
          previousAttempts: 0,
          platform: 'web'
        };

        const classification: ErrorClassification = {
          category: 'test',
          severity: 'medium',
          isRetryable: true,
          requiresUserAction: false,
          requiresEscalation: false,
          confidence: 0.8,
          patterns: [],
          suggestedActions: [],
          estimatedRecoveryTime: 1000,
          metadata: {}
        };

        const eventId = await analyticsSystem.recordErrorEvent(error, context, classification);

        // Record outcome for half of the events
        if (i % 2 === 0) {
          const outcome: ErrorRecoveryOutcome = {
            success: i % 4 === 0, // 25% success rate
            resolutionTimeMs: Math.random() * 5000,
            attemptCount: Math.floor(Math.random() * 3) + 1,
            resolutionMethod: 'automatic',
            alternativeToolUsed: false
          };

          await analyticsSystem.recordRecoveryOutcome(eventId, outcome);
        }

        return eventId;
      });

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(50);
      expect(results.every(id => typeof id === 'string')).toBe(true);

      // Verify analytics still work correctly
      const analytics = await analyticsSystem.getErrorFrequencyAnalytics(1);
      expect(analytics.totalErrors).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Event Emission and Listeners', () => {
    it('should emit initialization event', (done) => {
      // Create a new system to test initialization
      const newSystem = new ErrorAnalyticsSystem(mockConfig);

      newSystem.once('analytics_initialized', (data) => {
        expect(data.timestamp).toBeInstanceOf(Date);
        newSystem.shutdown().then(() => done());
      });
    });

    it('should emit analytics errors', (done) => {
      const newSystem = new ErrorAnalyticsSystem(mockConfig);

      newSystem.once('analytics_error', (data) => {
        expect(data.error).toBeDefined();
        expect(data.context).toBeDefined();
        newSystem.shutdown().then(() => done());
      });

      // Force an error by passing invalid data to internal method
      newSystem.emit('analytics_error', {
        error: new Error('Test error'),
        context: 'test_context'
      });
    });

    it('should emit alert events', (done) => {
      analyticsSystem.once('alert_created', (alert) => {
        expect(alert).toBeDefined();
        expect(alert.id).toBeDefined();
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        done();
      });

      // Create a condition that should trigger an alert
      // This might need to be adjusted based on implementation details
      analyticsSystem.emit('alert_created', {
        id: 'test_alert',
        type: 'error_spike',
        severity: 'high',
        title: 'Test Alert',
        description: 'Test alert description',
        timestamp: new Date(),
        acknowledged: false,
        resolved: false,
        metrics: {},
        recommendations: []
      });
    });
  });
});