/**
 * Security Monitor System
 * 
 * Implements comprehensive security monitoring and threat detection for the
 * Desktop Agent based on 2025 enterprise security patterns and zero-trust
 * architecture principles discovered in security research.
 * 
 * @fileoverview Advanced security monitoring with real-time threat detection
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SecurityEvent, SecurityEventType, SecuritySeverity, SecurityViolationThreshold } from '../types/agent-types';

/**
 * Security event statistics interface
 */
interface SecurityEventStats {
    total: number;
    bySeverity: Record<SecuritySeverity, number>;
    byType: Record<SecurityEventType, number>;
    lastHour: number;
    lastDay: number;
}

/**
 * Resource usage metrics
 */
interface ResourceMetrics {
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    cpu: {
        user: number;
        system: number;
        percent: number;
    };
    uptime: number;
    timestamp: Date;
}

/**
 * Network activity monitoring
 */
interface NetworkActivity {
    url: string;
    method: string;
    resourceType: string;
    timestamp: Date;
    blocked: boolean;
    reason?: string;
}

/**
 * Comprehensive Security Monitor Implementation
 * 
 * Provides real-time security monitoring, threat detection, behavioral analysis,
 * and automated incident response capabilities for the Desktop Agent.
 */
export class SecurityMonitor extends EventEmitter {
    private isMonitoring = false;
    private securityEvents: SecurityEvent[] = [];
    private networkActivity: NetworkActivity[] = [];
    private resourceMetrics: ResourceMetrics[] = [];
    private monitoredWindows: Map<number, BrowserWindow> = new Map();
    
    // Monitoring intervals
    private resourceMonitorInterval: NodeJS.Timeout | null = null;
    private securityAnalysisInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    
    // Security configuration
    private readonly config = {
        maxEventHistory: 10000,
        maxNetworkHistory: 5000,
        maxResourceHistory: 1000,
        cleanupInterval: 300000, // 5 minutes
        resourceCheckInterval: 30000, // 30 seconds
        analysisInterval: 60000, // 1 minute
        
        // Violation thresholds
        thresholds: {
            memory: 1000, // MB
            cpu: 80, // Percent
            networkRequests: 100, // Per minute
            securityEvents: 50 // Per minute
        } as const,
        
        // Alert thresholds by severity
        alertThresholds: [
            { severity: 'critical' as SecuritySeverity, count: 1, timeWindow: 60000, action: 'lockdown' },
            { severity: 'high' as SecuritySeverity, count: 3, timeWindow: 300000, action: 'alert' },
            { severity: 'medium' as SecuritySeverity, count: 10, timeWindow: 900000, action: 'alert' },
            { severity: 'low' as SecuritySeverity, count: 50, timeWindow: 3600000, action: 'log' }
        ] as SecurityViolationThreshold[]
    };

    constructor() {
        super();
        this.setupEventHandlers();
    }

    /**
     * Initialize the security monitor system
     */
    public async initialize(): Promise<void> {
        try {
            console.log('🔒 Initializing Security Monitor...');
            
            // Setup monitoring directories
            await this.setupMonitoringDirectories();
            
            // Initialize threat detection algorithms
            this.initializeThreatDetection();
            
            // Setup process monitoring
            this.setupProcessMonitoring();
            
            console.log('✅ Security Monitor initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Security Monitor:', error);
            throw error;
        }
    }

    /**
     * Start comprehensive security monitoring
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            console.warn('⚠️ Security monitoring already active');
            return;
        }

        this.isMonitoring = true;
        console.log('🔍 Starting security monitoring...');

        // Start resource monitoring
        this.resourceMonitorInterval = setInterval(() => {
            this.monitorResourceUsage();
        }, this.config.resourceCheckInterval);

        // Start security analysis
        this.securityAnalysisInterval = setInterval(() => {
            this.performSecurityAnalysis();
        }, this.config.analysisInterval);

        // Start cleanup routine
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldData();
        }, this.config.cleanupInterval);

        this.logSecurityEvent({
            type: 'monitoring-started',
            severity: 'low',
            message: 'Security monitoring has been activated',
            details: { timestamp: Date.now() }
        });
    }

    /**
     * Stop security monitoring
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        console.log('🛑 Stopping security monitoring...');

        // Clear intervals
        if (this.resourceMonitorInterval) {
            clearInterval(this.resourceMonitorInterval);
            this.resourceMonitorInterval = null;
        }

        if (this.securityAnalysisInterval) {
            clearInterval(this.securityAnalysisInterval);
            this.securityAnalysisInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.logSecurityEvent({
            type: 'monitoring-stopped',
            severity: 'low',
            message: 'Security monitoring has been deactivated',
            details: { timestamp: Date.now() }
        });
    }

    /**
     * Add a window to the monitoring list
     */
    public monitorWindow(window: BrowserWindow): void {
        this.monitoredWindows.set(window.id, window);
        
        this.logSecurityEvent({
            type: 'window-monitoring-started',
            severity: 'low',
            message: `Started monitoring window ${window.id}`,
            details: { windowId: window.id }
        });
    }

    /**
     * Remove a window from monitoring
     */
    public stopMonitoringWindow(windowId: number): void {
        this.monitoredWindows.delete(windowId);
        
        this.logSecurityEvent({
            type: 'window-monitoring-stopped',
            severity: 'low',
            message: `Stopped monitoring window ${windowId}`,
            details: { windowId }
        });
    }

    /**
     * Log a security event with automatic threat analysis
     */
    public logSecurityEvent(eventData: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'agentId'>): void {
        const event: SecurityEvent = {
            id: this.generateEventId(),
            timestamp: new Date(),
            agentId: process.env.AGENT_ID || 'unknown',
            resolved: false,
            ...eventData
        };

        // Add to event history
        this.securityEvents.unshift(event);

        // Trim history to prevent memory issues
        if (this.securityEvents.length > this.config.maxEventHistory) {
            this.securityEvents = this.securityEvents.slice(0, this.config.maxEventHistory);
        }

        // Log to console based on severity
        this.logEventToConsole(event);

        // Emit event for listeners
        this.emit('securityEvent', event);

        // Check for immediate threats
        this.checkImmediateThreat(event);

        // Check violation thresholds
        this.checkViolationThresholds(event);
    }

    /**
     * Log network activity for security analysis
     */
    public logNetworkActivity(activity: Omit<NetworkActivity, 'timestamp'>): void {
        const networkEvent: NetworkActivity = {
            ...activity,
            timestamp: new Date()
        };

        this.networkActivity.unshift(networkEvent);

        // Trim history
        if (this.networkActivity.length > this.config.maxNetworkHistory) {
            this.networkActivity = this.networkActivity.slice(0, this.config.maxNetworkHistory);
        }

        // Check for suspicious network patterns
        this.analyzeNetworkActivity(networkEvent);
    }

    /**
     * Get current security status
     */
    public getSecurityStatus(): any {
        return {
            monitoring: this.isMonitoring,
            events: this.getEventStats(),
            resources: this.getCurrentResourceMetrics(),
            windows: this.monitoredWindows.size,
            threats: this.getActiveThreats(),
            lastUpdate: new Date()
        };
    }

    /**
     * Get security event statistics
     */
    public getEventStats(): SecurityEventStats {
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1 hour
        const oneDayAgo = now - 86400000; // 24 hours

        const stats: SecurityEventStats = {
            total: this.securityEvents.length,
            bySeverity: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            },
            byType: {} as Record<SecurityEventType, number>,
            lastHour: 0,
            lastDay: 0
        };

        this.securityEvents.forEach(event => {
            // Count by severity
            stats.bySeverity[event.severity]++;

            // Count by type
            if (!stats.byType[event.type]) {
                stats.byType[event.type] = 0;
            }
            stats.byType[event.type]++;

            // Count by time window
            const eventTime = event.timestamp.getTime();
            if (eventTime > oneHourAgo) {
                stats.lastHour++;
            }
            if (eventTime > oneDayAgo) {
                stats.lastDay++;
            }
        });

        return stats;
    }

    /**
     * Check if monitoring is active
     */
    public isMonitoring(): boolean {
        return this.isMonitoring;
    }

    /**
     * Generate unique event identifier
     */
    private generateEventId(): string {
        return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Setup event handlers for the security monitor
     */
    private setupEventHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logSecurityEvent({
                type: 'uncaught-exception',
                severity: 'high',
                message: `Uncaught exception: ${error.message}`,
                details: { 
                    error: error.message, 
                    stack: error.stack,
                    pid: process.pid 
                }
            });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logSecurityEvent({
                type: 'suspicious-behavior',
                severity: 'medium',
                message: `Unhandled promise rejection`,
                details: { 
                    reason: reason instanceof Error ? reason.message : String(reason),
                    stack: reason instanceof Error ? reason.stack : undefined 
                }
            });
        });

        // Monitor memory warnings
        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning') {
                this.logSecurityEvent({
                    type: 'resource-violation',
                    severity: 'medium',
                    message: `Memory warning: ${warning.message}`,
                    details: { 
                        warning: warning.name,
                        message: warning.message 
                    }
                });
            }
        });
    }

    /**
     * Setup monitoring directories
     */
    private async setupMonitoringDirectories(): Promise<void> {
        const monitoringDir = path.join(os.tmpdir(), 'sim-agent-security');
        
        try {
            await fs.promises.mkdir(monitoringDir, { recursive: true });
        } catch (error) {
            // Directory might already exist, ignore error
        }
    }

    /**
     * Initialize threat detection algorithms
     */
    private initializeThreatDetection(): void {
        // Initialize behavioral analysis patterns
        this.setupBehavioralAnalysis();
        
        // Initialize anomaly detection
        this.setupAnomalyDetection();
        
        // Initialize signature-based detection
        this.setupSignatureDetection();
    }

    /**
     * Setup behavioral analysis patterns
     */
    private setupBehavioralAnalysis(): void {
        // Monitor for suspicious patterns
        setInterval(() => {
            this.analyzeBehavioralPatterns();
        }, 120000); // Every 2 minutes
    }

    /**
     * Setup anomaly detection algorithms
     */
    private setupAnomalyDetection(): void {
        // Statistical anomaly detection
        setInterval(() => {
            this.detectAnomalies();
        }, 180000); // Every 3 minutes
    }

    /**
     * Setup signature-based detection
     */
    private setupSignatureDetection(): void {
        // Known threat signatures
        this.loadThreatSignatures();
    }

    /**
     * Setup process monitoring
     */
    private setupProcessMonitoring(): void {
        // Monitor for suspicious process behavior
        setInterval(() => {
            this.monitorProcessBehavior();
        }, 30000); // Every 30 seconds
    }

    /**
     * Monitor resource usage and detect violations
     */
    private monitorResourceUsage(): void {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const metrics: ResourceMetrics = {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024) // MB
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
                percent: (cpuUsage.user + cpuUsage.system) / 10000 // Approximate percentage
            },
            uptime: process.uptime(),
            timestamp: new Date()
        };

        // Store metrics
        this.resourceMetrics.unshift(metrics);
        
        // Trim history
        if (this.resourceMetrics.length > this.config.maxResourceHistory) {
            this.resourceMetrics = this.resourceMetrics.slice(0, this.config.maxResourceHistory);
        }

        // Check for resource violations
        this.checkResourceViolations(metrics);
    }

    /**
     * Check for resource usage violations
     */
    private checkResourceViolations(metrics: ResourceMetrics): void {
        // Memory violation
        if (metrics.memory.heapUsed > this.config.thresholds.memory) {
            this.logSecurityEvent({
                type: 'resource-violation',
                severity: 'medium',
                message: `High memory usage: ${metrics.memory.heapUsed}MB`,
                details: { 
                    type: 'memory',
                    value: metrics.memory.heapUsed,
                    threshold: this.config.thresholds.memory
                }
            });
        }

        // CPU violation
        if (metrics.cpu.percent > this.config.thresholds.cpu) {
            this.logSecurityEvent({
                type: 'resource-violation',
                severity: 'medium',
                message: `High CPU usage: ${metrics.cpu.percent.toFixed(1)}%`,
                details: { 
                    type: 'cpu',
                    value: metrics.cpu.percent,
                    threshold: this.config.thresholds.cpu
                }
            });
        }
    }

    /**
     * Perform comprehensive security analysis
     */
    private performSecurityAnalysis(): void {
        // Analyze event patterns
        this.analyzeEventPatterns();
        
        // Check for coordinated attacks
        this.checkCoordinatedAttacks();
        
        // Assess overall security posture
        this.assessSecurityPosture();
        
        // Generate security report
        this.generateSecurityReport();
    }

    /**
     * Analyze behavioral patterns for threats
     */
    private analyzeBehavioralPatterns(): void {
        const recentEvents = this.getRecentEvents(300000); // Last 5 minutes
        
        // Check for rapid-fire events (possible automated attack)
        const eventCounts = new Map<SecurityEventType, number>();
        recentEvents.forEach(event => {
            eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
        });

        eventCounts.forEach((count, type) => {
            if (count > 20) { // More than 20 events of same type in 5 minutes
                this.logSecurityEvent({
                    type: 'suspicious-behavior',
                    severity: 'high',
                    message: `Rapid-fire security events detected: ${type}`,
                    details: { 
                        eventType: type,
                        count,
                        timeWindow: '5 minutes'
                    }
                });
            }
        });
    }

    /**
     * Detect statistical anomalies
     */
    private detectAnomalies(): void {
        if (this.resourceMetrics.length < 10) return;

        // Calculate moving averages for anomaly detection
        const recent = this.resourceMetrics.slice(0, 10);
        const baseline = this.resourceMetrics.slice(10, 60);
        
        if (baseline.length === 0) return;

        const recentAvgMemory = recent.reduce((sum, m) => sum + m.memory.heapUsed, 0) / recent.length;
        const baselineAvgMemory = baseline.reduce((sum, m) => sum + m.memory.heapUsed, 0) / baseline.length;
        
        // Memory anomaly detection (3x baseline)
        if (recentAvgMemory > baselineAvgMemory * 3) {
            this.logSecurityEvent({
                type: 'suspicious-behavior',
                severity: 'high',
                message: 'Memory usage anomaly detected',
                details: { 
                    recentAverage: recentAvgMemory,
                    baselineAverage: baselineAvgMemory,
                    ratio: recentAvgMemory / baselineAvgMemory
                }
            });
        }
    }

    /**
     * Load known threat signatures
     */
    private loadThreatSignatures(): void {
        // Implement signature-based detection patterns
        // This would normally load from a threat intelligence feed
    }

    /**
     * Monitor process behavior for suspicious activity
     */
    private monitorProcessBehavior(): void {
        // Monitor for process anomalies
        const currentLoad = os.loadavg()[0];
        
        if (currentLoad > 5) { // High system load
            this.logSecurityEvent({
                type: 'process-anomaly',
                severity: 'medium',
                message: `High system load detected: ${currentLoad.toFixed(2)}`,
                details: { 
                    systemLoad: currentLoad,
                    cpuCount: os.cpus().length
                }
            });
        }
    }

    /**
     * Analyze network activity for threats
     */
    private analyzeNetworkActivity(activity: NetworkActivity): void {
        // Check for blocked requests
        if (activity.blocked) {
            this.logSecurityEvent({
                type: 'network-anomaly',
                severity: 'medium',
                message: `Blocked network request: ${activity.url}`,
                details: { 
                    url: activity.url,
                    method: activity.method,
                    reason: activity.reason
                }
            });
        }

        // Check for suspicious patterns
        const recentActivity = this.networkActivity.slice(0, 100);
        const requestCounts = new Map<string, number>();
        
        recentActivity.forEach(req => {
            const domain = this.extractDomain(req.url);
            requestCounts.set(domain, (requestCounts.get(domain) || 0) + 1);
        });

        // Check for too many requests to single domain
        requestCounts.forEach((count, domain) => {
            if (count > 50) { // More than 50 requests to same domain
                this.logSecurityEvent({
                    type: 'network-anomaly',
                    severity: 'high',
                    message: `High request frequency to domain: ${domain}`,
                    details: { 
                        domain,
                        count,
                        timeWindow: 'recent activity'
                    }
                });
            }
        });
    }

    /**
     * Check for immediate threat conditions
     */
    private checkImmediateThreat(event: SecurityEvent): void {
        const criticalTypes: SecurityEventType[] = [
            'malicious-activity',
            'data-exfiltration',
            'privilege-escalation',
            'code-injection'
        ];

        if (criticalTypes.includes(event.type)) {
            this.emit('threatDetected', {
                severity: 'critical',
                event,
                timestamp: new Date(),
                action: 'immediate-response-required'
            });
        }
    }

    /**
     * Check security event violation thresholds
     */
    private checkViolationThresholds(event: SecurityEvent): void {
        const relevantThreshold = this.config.alertThresholds.find(t => t.severity === event.severity);
        if (!relevantThreshold) return;

        const windowStart = Date.now() - relevantThreshold.timeWindow;
        const recentEvents = this.securityEvents.filter(e => 
            e.severity === event.severity && 
            e.timestamp.getTime() > windowStart
        );

        if (recentEvents.length >= relevantThreshold.count) {
            this.emit('violationThreshold', {
                severity: event.severity,
                count: recentEvents.length,
                threshold: relevantThreshold,
                action: relevantThreshold.action,
                events: recentEvents.slice(0, 10) // Include recent events for context
            });
        }
    }

    /**
     * Analyze event patterns for security insights
     */
    private analyzeEventPatterns(): void {
        const recentEvents = this.getRecentEvents(3600000); // Last hour
        
        // Pattern analysis results would be emitted as insights
        this.emit('securityInsight', {
            type: 'pattern-analysis',
            findings: {
                totalEvents: recentEvents.length,
                dominantTypes: this.getDominantEventTypes(recentEvents),
                timeDistribution: this.getTimeDistribution(recentEvents)
            }
        });
    }

    /**
     * Check for coordinated attack patterns
     */
    private checkCoordinatedAttacks(): void {
        const recentEvents = this.getRecentEvents(900000); // Last 15 minutes
        
        // Look for coordinated attack indicators
        if (recentEvents.length > 100 && this.hasMultipleAttackVectors(recentEvents)) {
            this.logSecurityEvent({
                type: 'malicious-activity',
                severity: 'critical',
                message: 'Coordinated attack pattern detected',
                details: { 
                    eventCount: recentEvents.length,
                    timeWindow: '15 minutes',
                    attackVectors: this.getAttackVectors(recentEvents)
                }
            });
        }
    }

    /**
     * Assess overall security posture
     */
    private assessSecurityPosture(): void {
        const stats = this.getEventStats();
        let riskScore = 0;

        // Calculate risk based on event severity distribution
        riskScore += stats.bySeverity.critical * 10;
        riskScore += stats.bySeverity.high * 5;
        riskScore += stats.bySeverity.medium * 2;
        riskScore += stats.bySeverity.low * 0.5;

        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (riskScore < 10) riskLevel = 'low';
        else if (riskScore < 50) riskLevel = 'medium';
        else if (riskScore < 100) riskLevel = 'high';
        else riskLevel = 'critical';

        this.emit('securityPosture', {
            riskScore,
            riskLevel,
            stats,
            recommendations: this.generateRecommendations(riskLevel)
        });
    }

    /**
     * Generate periodic security report
     */
    private generateSecurityReport(): void {
        const report = {
            timestamp: new Date(),
            summary: this.getEventStats(),
            topThreats: this.getTopThreats(),
            resourceUsage: this.getCurrentResourceMetrics(),
            networkActivity: this.getNetworkSummary(),
            recommendations: this.generateRecommendations('medium')
        };

        this.emit('securityReport', report);
    }

    /**
     * Utility methods for security analysis
     */
    private getRecentEvents(timeWindow: number): SecurityEvent[] {
        const cutoff = Date.now() - timeWindow;
        return this.securityEvents.filter(event => event.timestamp.getTime() > cutoff);
    }

    private getDominantEventTypes(events: SecurityEvent[]): Record<SecurityEventType, number> {
        const counts: Record<string, number> = {};
        events.forEach(event => {
            counts[event.type] = (counts[event.type] || 0) + 1;
        });
        return counts as Record<SecurityEventType, number>;
    }

    private getTimeDistribution(events: SecurityEvent[]): any {
        // Implement time distribution analysis
        return {};
    }

    private hasMultipleAttackVectors(events: SecurityEvent[]): boolean {
        const types = new Set(events.map(e => e.type));
        return types.size >= 3; // Multiple attack types
    }

    private getAttackVectors(events: SecurityEvent[]): SecurityEventType[] {
        return Array.from(new Set(events.map(e => e.type)));
    }

    private getTopThreats(): any[] {
        // Implementation for top threats analysis
        return [];
    }

    private getCurrentResourceMetrics(): ResourceMetrics | null {
        return this.resourceMetrics[0] || null;
    }

    private getNetworkSummary(): any {
        // Implementation for network activity summary
        return {};
    }

    private generateRecommendations(riskLevel: string): string[] {
        const recommendations: string[] = [];
        
        if (riskLevel === 'critical') {
            recommendations.push('Immediate security review required');
            recommendations.push('Consider enabling lockdown mode');
        } else if (riskLevel === 'high') {
            recommendations.push('Increase monitoring frequency');
            recommendations.push('Review recent security events');
        }
        
        return recommendations;
    }

    private getActiveThreats(): any[] {
        return this.securityEvents
            .filter(e => e.severity === 'critical' || e.severity === 'high')
            .slice(0, 10);
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    private logEventToConsole(event: SecurityEvent): void {
        const icon = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            low: '📝'
        }[event.severity];

        console.log(`${icon} Security Event [${event.severity.toUpperCase()}]: ${event.message}`);
    }

    /**
     * Cleanup old data to prevent memory issues
     */
    private cleanupOldData(): void {
        const cutoff = Date.now() - 86400000; // 24 hours ago
        
        // Clean up old events
        const initialEventCount = this.securityEvents.length;
        this.securityEvents = this.securityEvents.filter(
            event => event.timestamp.getTime() > cutoff
        );
        
        // Clean up old network activity
        const initialNetworkCount = this.networkActivity.length;
        this.networkActivity = this.networkActivity.filter(
            activity => activity.timestamp.getTime() > cutoff
        );
        
        // Clean up old metrics
        const initialMetricsCount = this.resourceMetrics.length;
        this.resourceMetrics = this.resourceMetrics.filter(
            metrics => metrics.timestamp.getTime() > cutoff
        );
        
        if (initialEventCount > this.securityEvents.length ||
            initialNetworkCount > this.networkActivity.length ||
            initialMetricsCount > this.resourceMetrics.length) {
            
            this.logSecurityEvent({
                type: 'maintenance',
                severity: 'low',
                message: 'Cleaned up old monitoring data',
                details: {
                    eventsRemoved: initialEventCount - this.securityEvents.length,
                    networkRemoved: initialNetworkCount - this.networkActivity.length,
                    metricsRemoved: initialMetricsCount - this.resourceMetrics.length
                }
            });
        }
    }
}