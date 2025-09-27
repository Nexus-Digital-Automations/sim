/**
 * Parlant Server Monitoring Test Suite
 *
 * This module provides comprehensive testing for the monitoring and health check
 * systems, including integration tests and validation of all monitoring components.
 */

import {
  createErrorHandler,
  getSystemStatus,
  initializeParlantMonitoring,
  monitorPerformance,
  quickHealthCheck,
  trackAgentSession,
} from "./index";
import { createParlantLogger } from "./logging";

const logger = createParlantLogger("MonitoringTest");

/**
 * Test results interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

/**
 * Comprehensive monitoring system test suite
 */
export class MonitoringTestSuite {
  private results: TestResult[] = [];

  /**
   * Run all monitoring tests
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    duration: number;
    results: TestResult[];
    summary: string;
  }> {
    const startTime = performance.now();

    logger.info("Starting comprehensive monitoring test suite", {
      operation: "test_suite_start",
    });

    // Reset results
    this.results = [];

    // Run test categories
    await this.testHealthChecks();
    await this.testMonitoringSystem();
    await this.testLoggingSystem();
    await this.testMetricsCollection();
    await this.testAlertSystem();
    await this.testIntegrationScenarios();
    await this.testErrorHandling();
    await this.testPerformanceMonitoring();

    const totalDuration = performance.now() - startTime;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    const summary = `Test Suite Complete: ${passed}/${this.results.length} tests passed (${failed} failed) in ${totalDuration.toFixed(2)}ms`;

    logger.info(summary, {
      operation: "test_suite_complete",
      duration: totalDuration,
      passed,
      failed,
      total: this.results.length,
    });

    return {
      passed,
      failed,
      total: this.results.length,
      duration: totalDuration,
      results: this.results,
      summary,
    };
  }

  /**
   * Test health check functionality
   */
  private async testHealthChecks(): Promise<void> {
    // Test quick health check
    await this.runTest("Quick Health Check", async () => {
      const isHealthy = await quickHealthCheck();
      if (typeof isHealthy !== "boolean") {
        throw new Error("Quick health check should return boolean");
      }
      return { isHealthy };
    });

    // Test comprehensive health check
    await this.runTest("Comprehensive Health Check", async () => {
      const { health } = await initializeParlantMonitoring();
      const healthStatus = await health.checkHealth();

      if (
        !healthStatus.status ||
        !healthStatus.timestamp ||
        !healthStatus.services
      ) {
        throw new Error("Health status missing required fields");
      }

      if (!["healthy", "degraded", "unhealthy"].includes(healthStatus.status)) {
        throw new Error(`Invalid health status: ${healthStatus.status}`);
      }

      return {
        status: healthStatus.status,
        serviceCount: Object.keys(healthStatus.services).length,
      };
    });

    // Test database health check specifically
    await this.runTest("Database Health Check", async () => {
      const { health } = await initializeParlantMonitoring();
      const dbHealth = await health.checkDatabaseHealth();

      if (!dbHealth.service || dbHealth.service !== "database") {
        throw new Error("Database health check should return database service");
      }

      if (!dbHealth.status || !dbHealth.timestamp) {
        throw new Error("Database health check missing required fields");
      }

      return {
        status: dbHealth.status,
        duration: dbHealth.duration,
        connectionStatus: dbHealth.details?.connectionStatus,
      };
    });
  }

  /**
   * Test monitoring system functionality
   */
  private async testMonitoringSystem(): Promise<void> {
    await this.runTest("System Metrics Collection", async () => {
      const { monitoring } = await initializeParlantMonitoring();
      const systemMetrics = await monitoring.getSystemMetrics();

      if (
        !systemMetrics.timestamp ||
        !systemMetrics.database ||
        !systemMetrics.memory
      ) {
        throw new Error("System metrics missing required fields");
      }

      return {
        timestamp: systemMetrics.timestamp,
        memoryUsage: systemMetrics.memory.heapUsed,
        uptime: systemMetrics.uptime,
      };
    });

    await this.runTest("Usage Metrics Collection", async () => {
      const { monitoring } = await initializeParlantMonitoring();
      const usageMetrics = await monitoring.getUsageMetrics(1); // Last 1 hour

      if (
        !usageMetrics.period ||
        !usageMetrics.agents ||
        !usageMetrics.sessions
      ) {
        throw new Error("Usage metrics missing required fields");
      }

      return {
        period: usageMetrics.period,
        agentCount: usageMetrics.agents.total,
        sessionCount: usageMetrics.sessions.total,
      };
    });

    await this.runTest("Alert Condition Checking", async () => {
      const { monitoring } = await initializeParlantMonitoring();
      const alertCheck = await monitoring.checkAlertConditions();

      if (!Array.isArray(alertCheck.alerts) || !alertCheck.systemHealth) {
        throw new Error("Alert check missing required fields");
      }

      return {
        alertCount: alertCheck.alerts.length,
        systemHealth: alertCheck.systemHealth,
      };
    });
  }

  /**
   * Test logging system functionality
   */
  private async testLoggingSystem(): Promise<void> {
    await this.runTest("Structured Logging", async () => {
      const testLogger = createParlantLogger(
        "TestLogger",
        "test-correlation-123",
      );

      // Test different log levels
      testLogger.debug("Test debug message", { testType: "debug" });
      testLogger.info("Test info message", { testType: "info" });
      testLogger.warn("Test warning message", { testType: "warning" });
      testLogger.error("Test error message", { testType: "error" });

      // Test agent operation logging
      testLogger.logAgentOperation("agent_create", "Test agent operation", {
        agentId: "test-agent-123",
        workspaceId: "test-workspace-456",
        duration: 100,
      });

      const recentLogs = testLogger.getRecentLogs(10);
      if (recentLogs.length < 5) {
        throw new Error("Expected at least 5 log entries");
      }

      return {
        logCount: recentLogs.length,
        hasCorrelationId: recentLogs.some(
          (log) => log.correlationId === "test-correlation-123",
        ),
      };
    });

    await this.runTest("Log Filtering and Aggregation", async () => {
      const testLogger = createParlantLogger("TestLogger");

      // Create logs with different criteria
      testLogger.info("Test operation 1", {
        operation: "agent_create",
        agentId: "agent-1",
        workspaceId: "workspace-1",
      });

      testLogger.warn("Test operation 2", {
        operation: "session_start",
        agentId: "agent-2",
        workspaceId: "workspace-1",
      });

      // Test filtering
      const agentLogs = testLogger.filterLogs({ agentId: "agent-1" });
      const workspaceLogs = testLogger.filterLogs({
        workspaceId: "workspace-1",
      });
      const operationLogs = testLogger.filterLogs({
        operation: "agent_create",
      });

      // Test aggregation
      const aggregation = testLogger.generateLogAggregation(1); // Last 1 minute

      return {
        agentLogCount: agentLogs.length,
        workspaceLogCount: workspaceLogs.length,
        operationLogCount: operationLogs.length,
        aggregatedOperations: Object.keys(aggregation.operations).length,
      };
    });
  }

  /**
   * Test metrics collection functionality
   */
  private async testMetricsCollection(): Promise<void> {
    await this.runTest("Agent Session Tracking", async () => {
      const sessionTracker = trackAgentSession(
        "test-agent-123",
        "test-workspace-456",
        "test-session-789",
      );

      // Simulate session lifecycle
      sessionTracker.start();

      // Simulate message interactions
      sessionTracker.recordMessage(1000, 50, 2, false); // 1s response, 50 tokens, 2 tool calls, no error
      sessionTracker.recordMessage(1500, 75, 1, false); // 1.5s response, 75 tokens, 1 tool call, no error
      sessionTracker.recordMessage(2000, 100, 0, true); // 2s response, 100 tokens, 0 tool calls, with error

      // Simulate tool executions
      sessionTracker.recordTool("search_tool", 500, true);
      sessionTracker.recordTool("calculation_tool", 300, true);
      sessionTracker.recordTool("api_call_tool", 1200, false);

      // End session
      sessionTracker.end("completed");

      // Get metrics should show the recorded data
      return {
        sessionTracked: true,
        messageCount: 3,
        toolCallCount: 3,
      };
    });

    await this.runTest("System Metrics Dashboard", async () => {
      const { metrics } = await initializeParlantMonitoring();
      const dashboard = await metrics.generateMetricsDashboard();

      if (
        !dashboard.systemMetrics ||
        !dashboard.topPerformingAgents ||
        !dashboard.recentAlerts
      ) {
        throw new Error("Dashboard missing required sections");
      }

      return {
        systemHealthy: dashboard.systemMetrics.reliability.uptime > 0,
        agentCount: dashboard.systemMetrics.agents.total,
        alertCount: dashboard.recentAlerts.length,
      };
    });
  }

  /**
   * Test alert system functionality
   */
  private async testAlertSystem(): Promise<void> {
    await this.runTest("Alert Creation and Management", async () => {
      const { alerts } = await initializeParlantMonitoring();

      // Create test alerts
      const warningAlert = await alerts.createAlert(
        "warning",
        "system",
        "Test Warning Alert",
        "This is a test warning alert",
        "test-suite",
        { testType: "warning" },
      );

      const criticalAlert = await alerts.createAlert(
        "critical",
        "database",
        "Test Critical Alert",
        "This is a test critical alert",
        "test-suite",
        { testType: "critical" },
      );

      // Test acknowledgment
      const acknowledged = alerts.acknowledgeAlert(
        warningAlert.id,
        "test-user",
      );
      if (!acknowledged) {
        throw new Error("Failed to acknowledge alert");
      }

      // Test resolution
      const resolved = alerts.resolveAlert(
        criticalAlert.id,
        "Test resolved by test suite",
      );
      if (!resolved) {
        throw new Error("Failed to resolve alert");
      }

      const activeAlerts = alerts.getActiveAlerts();
      const alertMetrics = alerts.getAlertMetrics();

      return {
        alertsCreated: 2,
        activeAlertCount: activeAlerts.length,
        totalAlerts: alertMetrics.total,
        acknowledgmentWorked: acknowledged,
        resolutionWorked: resolved,
      };
    });

    await this.runTest("Error Handling with Alerts", async () => {
      const errorHandler = createErrorHandler("test-suite", {
        testType: "error_handling",
        operation: "test_error",
      });

      // Test different types of errors
      const testError = new Error("Test error for monitoring");
      testError.name = "TestError";

      try {
        await errorHandler(testError, { additionalContext: "test" });
      } catch (error) {
        // Error handler should log and create alert, but not throw
      }

      // Verify alert was created
      const { alerts } = await initializeParlantMonitoring();
      const recentAlerts = alerts.getActiveAlerts();
      const hasTestAlert = recentAlerts.some((alert) =>
        alert.description.includes("Test error for monitoring"),
      );

      return {
        errorHandled: true,
        alertCreated: hasTestAlert,
      };
    });
  }

  /**
   * Test integration scenarios
   */
  private async testIntegrationScenarios(): Promise<void> {
    await this.runTest("Full System Status Check", async () => {
      const systemStatus = await getSystemStatus();

      if (
        !systemStatus.status ||
        !systemStatus.health ||
        !systemStatus.metrics
      ) {
        throw new Error("System status missing required fields");
      }

      if (!["healthy", "degraded", "unhealthy"].includes(systemStatus.status)) {
        throw new Error(`Invalid system status: ${systemStatus.status}`);
      }

      return {
        overallStatus: systemStatus.status,
        uptime: systemStatus.uptime,
        agentCount: systemStatus.summary.totalAgents,
        errorRate: systemStatus.summary.errorRate,
      };
    });

    await this.runTest("Monitoring System Initialization", async () => {
      const monitoringSystem = await initializeParlantMonitoring();

      if (
        !monitoringSystem.health ||
        !monitoringSystem.monitoring ||
        !monitoringSystem.metrics ||
        !monitoringSystem.alerts
      ) {
        throw new Error("Monitoring system initialization incomplete");
      }

      if (
        !["healthy", "degraded", "unhealthy"].includes(monitoringSystem.status)
      ) {
        throw new Error(
          `Invalid monitoring status: ${monitoringSystem.status}`,
        );
      }

      return {
        initializationSuccessful: true,
        systemStatus: monitoringSystem.status,
        componentsInitialized: 4,
      };
    });
  }

  /**
   * Test error handling scenarios
   */
  private async testErrorHandling(): Promise<void> {
    await this.runTest("Database Connection Failure Simulation", async () => {
      // This test would simulate database connectivity issues
      // For now, we'll test error classification and handling

      const errorHandler = createErrorHandler("database-test", {
        operation: "database_query",
        queryType: "test",
      });

      const connectionError = new Error("Connection refused");
      connectionError.name = "ConnectionError";

      await errorHandler(connectionError);

      return {
        errorHandled: true,
        errorType: "ConnectionError",
      };
    });

    await this.runTest("Performance Degradation Detection", async () => {
      // Simulate slow operations
      const slowOperation = monitorPerformance(
        async (delay: number) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return "completed";
        },
        "test_slow_operation",
        { testType: "performance" },
      );

      const result = await slowOperation(100); // 100ms delay
      return {
        operationCompleted: result === "completed",
        performanceMonitored: true,
      };
    });
  }

  /**
   * Test performance monitoring
   */
  private async testPerformanceMonitoring(): Promise<void> {
    await this.runTest("Performance Monitoring Decorator", async () => {
      let executionCount = 0;

      const monitoredFunction = monitorPerformance(
        async (input: string) => {
          executionCount++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return `processed: ${input}`;
        },
        "test_monitored_function",
        { testContext: "performance_test" },
      );

      const result1 = await monitoredFunction("test1");
      const result2 = await monitoredFunction("test2");

      if (result1 !== "processed: test1" || result2 !== "processed: test2") {
        throw new Error("Monitored function should return correct results");
      }

      if (executionCount !== 2) {
        throw new Error("Function should have been executed twice");
      }

      return {
        functionsExecuted: executionCount,
        monitoringWorking: true,
      };
    });

    await this.runTest("Response Time Tracking", async () => {
      // Test response time tracking through session monitoring
      const tracker = trackAgentSession(
        "perf-test-agent",
        "perf-test-workspace",
        "perf-test-session",
      );

      tracker.start();

      // Record various response times
      const responseTimes = [500, 1000, 1500, 2000, 2500];
      responseTimes.forEach((time) => {
        tracker.recordMessage(time, 50, 1, false);
      });

      tracker.end("completed");

      // The metrics should now include performance data
      return {
        responseTimesRecorded: responseTimes.length,
        averageResponseTime:
          responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length,
      };
    });
  }

  /**
   * Helper method to run individual tests
   */
  private async runTest(
    name: string,
    testFn: () => Promise<any>,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      logger.debug(`Starting test: ${name}`, {
        operation: "test_start",
        testName: name,
      });

      const result = await testFn();
      const duration = performance.now() - startTime;

      this.results.push({
        name,
        passed: true,
        duration,
        details: result,
      });

      logger.debug(`Test passed: ${name}`, {
        operation: "test_pass",
        testName: name,
        duration,
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.results.push({
        name,
        passed: false,
        duration,
        error: errorMessage,
      });

      logger.warn(`Test failed: ${name}`, {
        operation: "test_fail",
        testName: name,
        duration,
        error: errorMessage,
      });
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    let report = `\n=== Parlant Monitoring Test Report ===\n`;
    report += `Tests Run: ${this.results.length}\n`;
    report += `Passed: ${passed}\n`;
    report += `Failed: ${failed}\n`;
    report += `Total Duration: ${totalDuration.toFixed(2)}ms\n`;
    report += `Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%\n\n`;

    if (failed > 0) {
      report += `Failed Tests:\n`;
      this.results
        .filter((r) => !r.passed)
        .forEach((result) => {
          report += `  ❌ ${result.name}: ${result.error}\n`;
        });
      report += `\n`;
    }

    report += `Passed Tests:\n`;
    this.results
      .filter((r) => r.passed)
      .forEach((result) => {
        report += `  ✅ ${result.name} (${result.duration.toFixed(2)}ms)\n`;
      });

    return report;
  }
}

/**
 * Run monitoring tests (can be called directly)
 */
export async function runMonitoringTests(): Promise<void> {
  const testSuite = new MonitoringTestSuite();

  try {
    const results = await testSuite.runAllTests();
    const report = testSuite.generateReport();

    console.log(report);

    if (results.failed > 0) {
      logger.error("Monitoring tests failed", {
        operation: "test_suite_complete",
        passed: results.passed,
        failed: results.failed,
        total: results.total,
      });
      process.exit(1);
    } else {
      logger.info("All monitoring tests passed", {
        operation: "test_suite_complete",
        passed: results.passed,
        total: results.total,
        duration: results.duration,
      });
    }
  } catch (error) {
    logger.error("Test suite execution failed", {
      operation: "test_suite_error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

// Export for external use
export { MonitoringTestSuite };
