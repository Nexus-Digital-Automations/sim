/**
 * Security Monitor for JavaScript Sandbox
 * 
 * Provides real-time security monitoring and threat detection for the
 * JavaScript execution environment with comprehensive logging and alerting.
 * 
 * Features:
 * - Real-time threat detection and analysis
 * - Behavioral monitoring and anomaly detection
 * - Security policy enforcement
 * - Comprehensive audit logging
 * - Performance impact analysis
 * 
 * Author: Claude Development Agent
 * Created: September 3, 2025
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

/**
 * Security monitoring and threat detection system
 */
class SecurityMonitor {
    constructor(config = {}) {
        this.config = {
            logLevel: config.logLevel || 'INFO',
            enableRealTimeMonitoring: config.enableRealTimeMonitoring !== false,
            enableBehavioralAnalysis: config.enableBehavioralAnalysis !== false,
            enableAuditLogging: config.enableAuditLogging !== false,
            alertThreshold: config.alertThreshold || 50,
            maxLogSize: config.maxLogSize || 10 * 1024 * 1024, // 10MB
            ...config
        };

        this.startTime = Date.now();
        this.events = [];
        this.alerts = [];
        this.statistics = {
            totalEvents: 0,
            securityViolations: 0,
            blockedOperations: 0,
            riskScore: 0
        };

        // Initialize monitoring
        this.initialize();
    }

    initialize() {
        console.log('[SECURITY_MONITOR] Initializing security monitoring system...');
        
        if (this.config.enableAuditLogging) {
            this.initializeAuditLogging();
        }

        if (this.config.enableRealTimeMonitoring) {
            this.startRealTimeMonitoring();
        }

        console.log('[SECURITY_MONITOR] Security monitoring system initialized');
    }

    /**
     * Initialize audit logging system
     */
    initializeAuditLogging() {
        const logDir = '/sandbox/logs';
        
        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
            }

            this.auditLogPath = path.join(logDir, `security-audit-${Date.now()}.log`);
            this.writeAuditLog('SYSTEM', 'Security monitoring initialized', { 
                config: this.config,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.warn('[SECURITY_MONITOR] Failed to initialize audit logging:', error.message);
        }
    }

    /**
     * Start real-time security monitoring
     */
    startRealTimeMonitoring() {
        // Monitor process events
        process.on('warning', (warning) => {
            this.logSecurityEvent('PROCESS_WARNING', 'medium', warning.message, {
                name: warning.name,
                stack: warning.stack
            });
        });

        // Monitor memory usage
        setInterval(() => {
            this.checkResourceUsage();
        }, 1000);

        // Monitor execution patterns
        setInterval(() => {
            this.analyzeBehavioralPatterns();
        }, 5000);
    }

    /**
     * Log security event with threat analysis
     */
    logSecurityEvent(type, severity, description, context = {}) {
        const event = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            type,
            severity,
            description,
            context,
            riskScore: this.calculateEventRiskScore(type, severity, context),
            source: 'SECURITY_MONITOR'
        };

        this.events.push(event);
        this.statistics.totalEvents++;

        if (severity === 'high' || severity === 'critical') {
            this.statistics.securityViolations++;
        }

        // Update overall risk score
        this.updateRiskScore(event.riskScore);

        // Check for alert conditions
        this.checkAlertConditions(event);

        // Log to console
        this.logToConsole(event);

        // Write to audit log
        if (this.config.enableAuditLogging) {
            this.writeAuditLog(event.type, event.description, {
                severity: event.severity,
                context: event.context,
                riskScore: event.riskScore
            });
        }

        return event;
    }

    /**
     * Calculate risk score for security event
     */
    calculateEventRiskScore(type, severity, context) {
        const baseSeverityScores = {
            'info': 1,
            'low': 5,
            'medium': 15,
            'high': 35,
            'critical': 50
        };

        const typeMultipliers = {
            'CODE_INJECTION': 2.0,
            'COMMAND_EXECUTION': 2.0,
            'FILE_ACCESS': 1.5,
            'NETWORK_ACCESS': 1.5,
            'MEMORY_VIOLATION': 1.3,
            'RESOURCE_ABUSE': 1.2,
            'PROCESS_WARNING': 1.1,
            'DEFAULT': 1.0
        };

        const baseScore = baseSeverityScores[severity] || 5;
        const multiplier = typeMultipliers[type] || typeMultipliers['DEFAULT'];
        
        return Math.min(100, Math.round(baseScore * multiplier));
    }

    /**
     * Update overall system risk score
     */
    updateRiskScore(eventRiskScore) {
        // Weighted moving average with decay
        const decayFactor = 0.95;
        const weight = 0.1;
        
        this.statistics.riskScore = Math.round(
            this.statistics.riskScore * decayFactor + eventRiskScore * weight
        );
    }

    /**
     * Check for alert conditions
     */
    checkAlertConditions(event) {
        const shouldAlert = 
            event.severity === 'critical' ||
            (event.severity === 'high' && event.riskScore > this.config.alertThreshold) ||
            this.statistics.riskScore > this.config.alertThreshold;

        if (shouldAlert) {
            this.createAlert(event);
        }
    }

    /**
     * Create security alert
     */
    createAlert(event) {
        const alert = {
            id: this.generateEventId(),
            timestamp: new Date().toISOString(),
            level: event.severity === 'critical' ? 'CRITICAL' : 'HIGH',
            title: `Security Alert: ${event.type}`,
            description: event.description,
            event: event,
            systemRiskScore: this.statistics.riskScore,
            recommendedActions: this.generateRecommendations(event)
        };

        this.alerts.push(alert);

        // Log critical alerts immediately
        console.error(`[SECURITY_ALERT] ${alert.level}: ${alert.title}`);
        console.error(`[SECURITY_ALERT] Description: ${alert.description}`);
        console.error(`[SECURITY_ALERT] System Risk Score: ${alert.systemRiskScore}`);
        
        if (alert.recommendedActions.length > 0) {
            console.error(`[SECURITY_ALERT] Recommended Actions:`, alert.recommendedActions);
        }
    }

    /**
     * Generate security recommendations based on event
     */
    generateRecommendations(event) {
        const recommendations = [];

        switch (event.type) {
            case 'CODE_INJECTION':
                recommendations.push('Immediately terminate execution');
                recommendations.push('Review code for injection vulnerabilities');
                recommendations.push('Implement input validation');
                break;

            case 'COMMAND_EXECUTION':
                recommendations.push('Block system command execution');
                recommendations.push('Audit code for subprocess usage');
                recommendations.push('Enable enhanced sandboxing');
                break;

            case 'MEMORY_VIOLATION':
                recommendations.push('Reduce memory limits');
                recommendations.push('Monitor for memory leaks');
                recommendations.push('Implement garbage collection tuning');
                break;

            case 'NETWORK_ACCESS':
                recommendations.push('Review network access policies');
                recommendations.push('Enable network monitoring');
                recommendations.push('Implement request filtering');
                break;

            default:
                recommendations.push('Review security logs');
                recommendations.push('Monitor system behavior');
                break;
        }

        return recommendations;
    }

    /**
     * Check resource usage patterns
     */
    checkResourceUsage() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Memory threshold check
        const memoryThresholdMB = 200;
        const currentMemoryMB = memUsage.heapUsed / 1024 / 1024;
        
        if (currentMemoryMB > memoryThresholdMB) {
            this.logSecurityEvent('MEMORY_VIOLATION', 'high', 
                `High memory usage detected: ${currentMemoryMB.toFixed(2)}MB`, {
                    memoryUsage: memUsage,
                    threshold: memoryThresholdMB
                });
        }

        // CPU usage pattern analysis
        const cpuThreshold = 80; // 80% threshold
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        
        if (cpuPercent > cpuThreshold) {
            this.logSecurityEvent('RESOURCE_ABUSE', 'medium',
                `High CPU usage detected: ${cpuPercent.toFixed(2)}%`, {
                    cpuUsage: cpuUsage,
                    threshold: cpuThreshold
                });
        }
    }

    /**
     * Analyze behavioral patterns for anomalies
     */
    analyzeBehavioralPatterns() {
        if (this.events.length < 10) return; // Need minimum events for analysis

        const recentEvents = this.events.slice(-50); // Last 50 events
        const eventTypes = {};
        const severityCounts = {};

        // Count event types and severities
        for (const event of recentEvents) {
            eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
            severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
        }

        // Check for anomalous patterns
        const criticalCount = severityCounts['critical'] || 0;
        const highCount = severityCounts['high'] || 0;

        if (criticalCount > 5) {
            this.logSecurityEvent('ANOMALY_DETECTION', 'critical',
                `Unusual pattern: ${criticalCount} critical events in recent activity`, {
                    eventTypes,
                    severityCounts,
                    timeWindow: '50 events'
                });
        } else if (highCount > 10) {
            this.logSecurityEvent('ANOMALY_DETECTION', 'high',
                `Elevated threat activity: ${highCount} high-severity events`, {
                    eventTypes,
                    severityCounts,
                    timeWindow: '50 events'
                });
        }

        // Check for repetitive attack patterns
        for (const [type, count] of Object.entries(eventTypes)) {
            if (count > 15 && (type === 'CODE_INJECTION' || type === 'COMMAND_EXECUTION')) {
                this.logSecurityEvent('ATTACK_PATTERN', 'critical',
                    `Potential attack pattern detected: ${count} ${type} events`, {
                        attackType: type,
                        frequency: count,
                        timeWindow: '50 events'
                    });
            }
        }
    }

    /**
     * Log event to console with appropriate formatting
     */
    logToConsole(event) {
        const logLevels = { 'info': 'INFO', 'low': 'WARN', 'medium': 'WARN', 'high': 'ERROR', 'critical': 'ERROR' };
        const level = logLevels[event.severity] || 'INFO';

        const message = `[${level}] [${event.type}] ${event.description} (Risk: ${event.riskScore})`;

        switch (level) {
            case 'ERROR':
                console.error(message);
                break;
            case 'WARN':
                console.warn(message);
                break;
            default:
                if (this.config.logLevel === 'DEBUG' || this.config.logLevel === 'INFO') {
                    console.log(message);
                }
                break;
        }
    }

    /**
     * Write to audit log file
     */
    writeAuditLog(type, description, metadata = {}) {
        if (!this.auditLogPath) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            description,
            metadata,
            pid: process.pid
        };

        try {
            fs.appendFileSync(this.auditLogPath, JSON.stringify(logEntry) + '\n');
            
            // Rotate log if it gets too large
            const stats = fs.statSync(this.auditLogPath);
            if (stats.size > this.config.maxLogSize) {
                this.rotateAuditLog();
            }
        } catch (error) {
            console.warn('[SECURITY_MONITOR] Failed to write audit log:', error.message);
        }
    }

    /**
     * Rotate audit log file
     */
    rotateAuditLog() {
        if (!this.auditLogPath) return;

        try {
            const rotatedPath = `${this.auditLogPath}.${Date.now()}`;
            fs.renameSync(this.auditLogPath, rotatedPath);
            console.log('[SECURITY_MONITOR] Rotated audit log:', rotatedPath);
        } catch (error) {
            console.warn('[SECURITY_MONITOR] Failed to rotate audit log:', error.message);
        }
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `SEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get security status report
     */
    getSecurityReport() {
        const uptime = Date.now() - this.startTime;
        const recentEvents = this.events.slice(-20);
        const recentAlerts = this.alerts.slice(-10);

        return {
            timestamp: new Date().toISOString(),
            uptime,
            statistics: this.statistics,
            riskLevel: this.getRiskLevel(),
            recentEvents,
            recentAlerts,
            systemHealth: this.getSystemHealth(),
            recommendations: this.getSystemRecommendations()
        };
    }

    /**
     * Get current risk level
     */
    getRiskLevel() {
        const score = this.statistics.riskScore;
        if (score >= 80) return 'CRITICAL';
        if (score >= 60) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        if (score >= 20) return 'LOW';
        return 'MINIMAL';
    }

    /**
     * Get system health indicators
     */
    getSystemHealth() {
        const memUsage = process.memoryUsage();
        
        return {
            memoryUsage: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024)
            },
            uptime: process.uptime(),
            eventRate: this.statistics.totalEvents / (process.uptime() / 60), // Events per minute
            alertCount: this.alerts.length
        };
    }

    /**
     * Get system-level recommendations
     */
    getSystemRecommendations() {
        const recommendations = [];
        const riskScore = this.statistics.riskScore;

        if (riskScore > 70) {
            recommendations.push('Consider terminating execution due to high risk score');
            recommendations.push('Review recent security events for attack patterns');
            recommendations.push('Enable maximum security monitoring');
        } else if (riskScore > 40) {
            recommendations.push('Increase monitoring frequency');
            recommendations.push('Review security policies');
            recommendations.push('Monitor for escalating threats');
        }

        const alertCount = this.alerts.length;
        if (alertCount > 5) {
            recommendations.push('Investigate recurring security alerts');
            recommendations.push('Consider adjusting security thresholds');
        }

        return recommendations;
    }

    /**
     * Cleanup and shutdown monitoring
     */
    shutdown() {
        console.log('[SECURITY_MONITOR] Shutting down security monitoring...');
        
        const finalReport = this.getSecurityReport();
        console.log('[SECURITY_MONITOR] Final Security Report:', JSON.stringify(finalReport, null, 2));

        if (this.config.enableAuditLogging) {
            this.writeAuditLog('SYSTEM', 'Security monitoring shutdown', finalReport);
        }
    }
}

// Export for use in other modules
module.exports = { SecurityMonitor };

// If run directly, start monitoring
if (require.main === module) {
    const monitor = new SecurityMonitor({
        logLevel: 'INFO',
        enableRealTimeMonitoring: true,
        enableAuditLogging: true
    });

    // Test security monitoring
    monitor.logSecurityEvent('SYSTEM_TEST', 'info', 'Security monitor test execution');
    
    // Simulate some security events for testing
    setTimeout(() => {
        monitor.logSecurityEvent('CODE_INJECTION', 'high', 'Test injection pattern detected');
    }, 1000);

    setTimeout(() => {
        monitor.logSecurityEvent('MEMORY_VIOLATION', 'medium', 'Test memory threshold exceeded');
    }, 2000);

    // Keep running for testing
    setTimeout(() => {
        const report = monitor.getSecurityReport();
        console.log('\n=== Security Monitoring Test Report ===');
        console.log(JSON.stringify(report, null, 2));
        monitor.shutdown();
    }, 5000);
}