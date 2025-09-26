/**
 * Parlant Server Monitoring and Metrics Collection
 *
 * This module provides comprehensive monitoring capabilities for Parlant server
 * operations, including performance metrics, usage statistics, and operational insights.
 */
export interface AgentPerformanceMetrics {
    agentId: string;
    agentName?: string;
    workspaceId?: string;
    metrics: {
        totalSessions: number;
        totalMessages: number;
        averageResponseTime: number;
        successRate: number;
        errorCount: number;
        lastActiveAt: string;
    };
    timeWindow: {
        start: string;
        end: string;
        duration: string;
    };
}
export interface SystemMetrics {
    timestamp: string;
    database: {
        connectionCount: number;
        queryTime: {
            average: number;
            p95: number;
            p99: number;
        };
        activeQueries: number;
        slowQueries: number;
    };
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    uptime: number;
}
export interface UsageMetrics {
    period: {
        start: string;
        end: string;
    };
    agents: {
        total: number;
        active: number;
        created: number;
    };
    sessions: {
        total: number;
        active: number;
        completed: number;
        failed: number;
    };
    messages: {
        total: number;
        user: number;
        agent: number;
        system: number;
    };
    tools: {
        totalCalls: number;
        uniqueTools: number;
        successRate: number;
        mostUsed: Array<{
            tool: string;
            count: number;
        }>;
    };
}
export interface AlertThresholds {
    database: {
        connectionCount: number;
        queryTimeP95: number;
        queryTimeP99: number;
        errorRate: number;
    };
    memory: {
        heapUsagePercent: number;
        rssUsagePercent: number;
    };
    agent: {
        errorRate: number;
        responseTime: number;
        sessionFailureRate: number;
    };
}
/**
 * Default alert thresholds for Parlant server monitoring
 */
export declare const DEFAULT_ALERT_THRESHOLDS: AlertThresholds;
/**
 * Parlant Server Monitoring Service
 */
export declare class ParlantMonitoringService {
    private queryTimes;
    private maxQueryTimeHistory;
    private alertThresholds;
    constructor(alertThresholds?: AlertThresholds);
    /**
     * Record database query performance
     */
    recordQueryTime(duration: number): void;
    /**
     * Get system performance metrics
     */
    getSystemMetrics(): Promise<SystemMetrics>;
    /**
     * Get agent performance metrics for a specific time window
     */
    getAgentPerformanceMetrics(timeWindowMinutes?: number, agentId?: string): Promise<AgentPerformanceMetrics[]>;
    /**
     * Get usage statistics for a time period
     */
    getUsageMetrics(periodHours?: number): Promise<UsageMetrics>;
    /**
     * Check if any metrics exceed alert thresholds
     */
    checkAlertConditions(): Promise<{
        alerts: Array<{
            severity: 'warning' | 'critical';
            category: string;
            message: string;
            value: number;
            threshold: number;
            timestamp: string;
        }>;
        systemHealth: 'healthy' | 'degraded' | 'critical';
    }>;
    /**
     * Generate monitoring dashboard data
     */
    generateDashboardData(): Promise<{
        summary: {
            status: 'healthy' | 'degraded' | 'critical';
            uptime: number;
            lastUpdated: string;
        };
        metrics: SystemMetrics;
        usage: UsageMetrics;
        alerts: any[];
    }>;
}
/**
 * Singleton monitoring service instance
 */
export declare const parlantMonitoring: ParlantMonitoringService;
/**
 * Export monitoring utilities
 */
export declare const monitoring: {
    system: () => Promise<SystemMetrics>;
    agents: (timeWindow?: number, agentId?: string) => Promise<AgentPerformanceMetrics[]>;
    usage: (periodHours?: number) => Promise<UsageMetrics>;
    alerts: () => Promise<{
        alerts: Array<{
            severity: "warning" | "critical";
            category: string;
            message: string;
            value: number;
            threshold: number;
            timestamp: string;
        }>;
        systemHealth: "healthy" | "degraded" | "critical";
    }>;
    dashboard: () => Promise<{
        summary: {
            status: "healthy" | "degraded" | "critical";
            uptime: number;
            lastUpdated: string;
        };
        metrics: SystemMetrics;
        usage: UsageMetrics;
        alerts: any[];
    }>;
    recordQuery: (duration: number) => void;
};
