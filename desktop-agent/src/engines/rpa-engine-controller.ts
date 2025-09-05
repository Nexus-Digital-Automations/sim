/**
 * RPA Engine Controller
 * 
 * Orchestrates multiple RPA automation frameworks including Nut.js, Playwright,
 * and PyAutoGUI based on comprehensive research findings. Implements intelligent
 * engine selection, performance optimization, and enterprise-grade reliability.
 * 
 * @fileoverview Multi-engine RPA controller with intelligent selection algorithms
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { 
    RPAWorkflow, 
    WorkflowExecutionContext, 
    WorkflowResult, 
    WorkflowError, 
    WorkflowProgress,
    RPAEngineType,
    IRPAEngine,
    EngineStatus,
    EngineMetrics,
    AgentCapabilities
} from '../types/agent-types';

// Import engine implementations
import { NutjsEngine } from './nutjs-engine';
import { PlaywrightEngine } from './playwright-engine';
import { PyAutoGUIEngine } from './pyautogui-engine';

/**
 * Engine performance metrics tracking
 */
interface EnginePerformanceData {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: Date;
    errorRate: number;
    performanceScore: number;
}

/**
 * Execution tracking information
 */
interface ExecutionTracker {
    executionId: string;
    workflowId: string;
    engine: RPAEngineType;
    startTime: Date;
    context: WorkflowExecutionContext;
    process?: ChildProcess;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
}

/**
 * Engine configuration interface
 */
interface EngineConfig {
    enabled: boolean;
    priority: number;
    maxConcurrentExecutions: number;
    timeout: number;
    retryAttempts: number;
    healthCheckInterval: number;
}

/**
 * RPA Engine Controller Configuration
 */
interface RPAControllerConfig {
    maxConcurrentExecutions: number;
    defaultTimeout: number;
    enablePerformanceMetrics: boolean;
    enableAutoRecovery: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    engines: {
        nutjs: EngineConfig;
        playwright: EngineConfig;
        pyautogui: EngineConfig;
    };
}

/**
 * Workflow analysis results for engine selection
 */
interface WorkflowAnalysis {
    isWebBased: boolean;
    isDesktopBased: boolean;
    requiresImageRecognition: boolean;
    requiresOCR: boolean;
    requiresHighPerformance: boolean;
    complexity: 'low' | 'medium' | 'high';
    estimatedDuration: number;
    recommendedEngine: RPAEngineType;
    alternativeEngines: RPAEngineType[];
    confidence: number;
}

/**
 * Multi-Engine RPA Controller
 * 
 * Provides intelligent orchestration of multiple RPA engines with automatic
 * engine selection, performance optimization, and failure recovery.
 */
export class RPAEngineController extends EventEmitter {
    private engines: Map<RPAEngineType, IRPAEngine> = new Map();
    private activeExecutions: Map<string, ExecutionTracker> = new Map();
    private enginePerformance: Map<RPAEngineType, EnginePerformanceData> = new Map();
    private config: RPAControllerConfig;
    
    // Health monitoring
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private isInitialized = false;

    constructor(config?: Partial<RPAControllerConfig>) {
        super();
        
        // Default configuration based on research findings
        this.config = {
            maxConcurrentExecutions: 5,
            defaultTimeout: 300000, // 5 minutes
            enablePerformanceMetrics: true,
            enableAutoRecovery: true,
            logLevel: 'info',
            engines: {
                nutjs: {
                    enabled: true,
                    priority: 1, // Highest priority based on research (100x faster)
                    maxConcurrentExecutions: 3,
                    timeout: 300000,
                    retryAttempts: 3,
                    healthCheckInterval: 60000
                },
                playwright: {
                    enabled: true,
                    priority: 2, // Second priority for web automation
                    maxConcurrentExecutions: 2,
                    timeout: 300000,
                    retryAttempts: 2,
                    healthCheckInterval: 60000
                },
                pyautogui: {
                    enabled: false, // Disabled by default due to security concerns
                    priority: 3, // Fallback engine
                    maxConcurrentExecutions: 1,
                    timeout: 180000,
                    retryAttempts: 1,
                    healthCheckInterval: 120000
                }
            },
            ...config
        };

        this.initializePerformanceTracking();
        this.setupEventHandlers();
    }

    /**
     * Initialize all available RPA engines
     */
    public async initializeEngines(): Promise<boolean> {
        try {
            this.log('info', '🚀 Initializing RPA engines...');
            
            const initResults: Array<{ engine: RPAEngineType; success: boolean }> = [];

            // Initialize Nut.js Engine (Primary)
            if (this.config.engines.nutjs.enabled) {
                try {
                    const nutjsEngine = new NutjsEngine();
                    const nutjsSuccess = await nutjsEngine.initialize({
                        logLevel: this.config.logLevel,
                        timeout: this.config.engines.nutjs.timeout,
                        retryAttempts: this.config.engines.nutjs.retryAttempts
                    });
                    
                    if (nutjsSuccess) {
                        this.engines.set('nutjs', nutjsEngine);
                        initResults.push({ engine: 'nutjs', success: true });
                        this.log('info', '✅ Nut.js engine initialized successfully');
                    } else {
                        initResults.push({ engine: 'nutjs', success: false });
                        this.log('error', '❌ Failed to initialize Nut.js engine');
                    }
                } catch (error) {
                    initResults.push({ engine: 'nutjs', success: false });
                    this.log('error', '❌ Nut.js engine initialization error:', error);
                }
            }

            // Initialize Playwright Engine (Secondary)
            if (this.config.engines.playwright.enabled) {
                try {
                    const playwrightEngine = new PlaywrightEngine();
                    const playwrightSuccess = await playwrightEngine.initialize({
                        logLevel: this.config.logLevel,
                        timeout: this.config.engines.playwright.timeout,
                        headless: false, // Visible for RPA
                        browsers: ['chromium', 'firefox'],
                        viewport: { width: 1920, height: 1080 }
                    });
                    
                    if (playwrightSuccess) {
                        this.engines.set('playwright', playwrightEngine);
                        initResults.push({ engine: 'playwright', success: true });
                        this.log('info', '✅ Playwright engine initialized successfully');
                    } else {
                        initResults.push({ engine: 'playwright', success: false });
                        this.log('error', '❌ Failed to initialize Playwright engine');
                    }
                } catch (error) {
                    initResults.push({ engine: 'playwright', success: false });
                    this.log('error', '❌ Playwright engine initialization error:', error);
                }
            }

            // Initialize PyAutoGUI Engine (Tertiary/Fallback)
            if (this.config.engines.pyautogui.enabled) {
                try {
                    const pyAutoGUIEngine = new PyAutoGUIEngine();
                    const pyAutoGUISuccess = await pyAutoGUIEngine.initialize({
                        logLevel: this.config.logLevel,
                        timeout: this.config.engines.pyautogui.timeout,
                        failSafe: true, // Enable fail-safe for security
                        childProcess: true // Run in isolated process
                    });
                    
                    if (pyAutoGUISuccess) {
                        this.engines.set('pyautogui', pyAutoGUIEngine);
                        initResults.push({ engine: 'pyautogui', success: true });
                        this.log('info', '✅ PyAutoGUI engine initialized successfully');
                    } else {
                        initResults.push({ engine: 'pyautogui', success: false });
                        this.log('error', '❌ Failed to initialize PyAutoGUI engine');
                    }
                } catch (error) {
                    initResults.push({ engine: 'pyautogui', success: false });
                    this.log('error', '❌ PyAutoGUI engine initialization error:', error);
                }
            }

            // Check if at least one engine initialized successfully
            const successfulEngines = initResults.filter(r => r.success);
            
            if (successfulEngines.length === 0) {
                this.log('error', '❌ No RPA engines initialized successfully');
                return false;
            }

            // Start health monitoring
            this.startHealthMonitoring();
            
            this.isInitialized = true;
            
            this.log('info', `✅ RPA Engine Controller initialized with ${successfulEngines.length} engines`, {
                engines: successfulEngines.map(e => e.engine),
                capabilities: this.getCapabilities()
            });

            return true;
            
        } catch (error) {
            this.log('error', '❌ Failed to initialize RPA engines:', error);
            return false;
        }
    }

    /**
     * Execute workflow with intelligent engine selection
     */
    public async executeWorkflow(workflow: RPAWorkflow, context: WorkflowExecutionContext): Promise<WorkflowResult> {
        const executionId = context.executionId;
        const startTime = new Date();

        try {
            this.log('info', `🚀 Starting workflow execution: ${workflow.name} (${executionId})`);

            // Validate workflow
            const validation = await this.validateWorkflow(workflow);
            if (!validation.isValid) {
                throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
            }

            // Analyze workflow and select optimal engine
            const analysis = await this.analyzeWorkflow(workflow);
            const selectedEngine = this.selectOptimalEngine(analysis);

            if (!selectedEngine) {
                throw new Error('No suitable engine available for workflow execution');
            }

            this.log('info', `🎯 Selected engine: ${selectedEngine.name} (confidence: ${analysis.confidence}%)`);

            // Check engine availability
            if (!this.isEngineAvailable(selectedEngine.type)) {
                throw new Error(`Selected engine ${selectedEngine.type} is not available`);
            }

            // Track execution
            const tracker: ExecutionTracker = {
                executionId,
                workflowId: workflow.id,
                engine: selectedEngine.type,
                startTime,
                context,
                status: 'running'
            };
            this.activeExecutions.set(executionId, tracker);

            // Emit workflow started event
            this.emit('workflowStarted', {
                executionId,
                workflowId: workflow.id,
                engine: selectedEngine.type,
                startTime
            });

            // Execute workflow
            const result = await selectedEngine.execute(workflow, {
                ...context,
                onProgress: (progress) => this.handleProgress(executionId, progress),
                onError: (error) => this.handleExecutionError(executionId, error)
            });

            // Update tracker
            tracker.status = 'completed';
            
            // Record performance metrics
            await this.recordPerformanceMetrics(selectedEngine.type, result, startTime);

            // Emit completion event
            this.emit('workflowCompleted', {
                executionId,
                workflowId: workflow.id,
                result,
                engine: selectedEngine.type,
                duration: Date.now() - startTime.getTime()
            });

            this.log('info', `✅ Workflow execution completed: ${workflow.name} (${executionId})`);

            return result;

        } catch (error) {
            // Update tracker
            const tracker = this.activeExecutions.get(executionId);
            if (tracker) {
                tracker.status = 'failed';
            }

            // Emit error event
            this.emit('workflowError', {
                executionId,
                workflowId: workflow.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            });

            this.log('error', `❌ Workflow execution failed: ${workflow.name} (${executionId})`, error);

            throw error;

        } finally {
            // Clean up execution tracking
            setTimeout(() => {
                this.activeExecutions.delete(executionId);
            }, 30000); // Keep for 30 seconds for reference
        }
    }

    /**
     * Stop workflow execution
     */
    public async stopWorkflow(executionId: string): Promise<boolean> {
        const tracker = this.activeExecutions.get(executionId);
        if (!tracker) {
            this.log('warn', `⚠️ Execution ${executionId} not found for stopping`);
            return false;
        }

        try {
            this.log('info', `🛑 Stopping workflow execution: ${executionId}`);

            // Get the engine
            const engine = this.engines.get(tracker.engine);
            if (engine) {
                await engine.stop(executionId);
            }

            // Kill process if exists
            if (tracker.process && !tracker.process.killed) {
                tracker.process.kill('SIGTERM');
            }

            // Update status
            tracker.status = 'cancelled';

            this.log('info', `✅ Workflow execution stopped: ${executionId}`);
            return true;

        } catch (error) {
            this.log('error', `❌ Failed to stop workflow execution: ${executionId}`, error);
            return false;
        }
    }

    /**
     * Stop all active executions
     */
    public async stopAllExecutions(): Promise<void> {
        const executionIds = Array.from(this.activeExecutions.keys());
        
        this.log('info', `🛑 Stopping all executions: ${executionIds.length} active`);

        const stopPromises = executionIds.map(id => this.stopWorkflow(id));
        await Promise.allSettled(stopPromises);
    }

    /**
     * Get available agent capabilities based on active engines
     */
    public getCapabilities(): AgentCapabilities[] {
        const capabilities: Set<AgentCapabilities> = new Set(['desktop-automation', 'cross-platform-support']);

        this.engines.forEach((engine, type) => {
            switch (type) {
                case 'nutjs':
                    capabilities.add('image-recognition');
                    capabilities.add('ocr-processing');
                    capabilities.add('system-monitoring');
                    break;
                case 'playwright':
                    capabilities.add('web-automation');
                    break;
                case 'pyautogui':
                    // Basic capabilities already covered
                    break;
            }
        });

        return Array.from(capabilities);
    }

    /**
     * Get active engine types
     */
    public getActiveEngines(): RPAEngineType[] {
        return Array.from(this.engines.keys());
    }

    /**
     * Check if engine is available
     */
    public hasEngine(engineType: RPAEngineType): boolean {
        return this.engines.has(engineType);
    }

    /**
     * Get engine status
     */
    public getEngineStatus(engineType: RPAEngineType): EngineStatus | null {
        const engine = this.engines.get(engineType);
        return engine ? engine.getStatus() : null;
    }

    /**
     * Get all engine statuses
     */
    public getAllEngineStatuses(): Record<string, EngineStatus> {
        const statuses: Record<string, EngineStatus> = {};
        
        this.engines.forEach((engine, type) => {
            statuses[type] = engine.getStatus();
        });

        return statuses;
    }

    /**
     * Get performance metrics for all engines
     */
    public getPerformanceMetrics(): Record<string, EnginePerformanceData> {
        const metrics: Record<string, EnginePerformanceData> = {};
        
        this.enginePerformance.forEach((data, type) => {
            metrics[type] = { ...data };
        });

        return metrics;
    }

    /**
     * Validate workflow before execution
     */
    private async validateWorkflow(workflow: RPAWorkflow): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Basic structure validation
        if (!workflow.id) errors.push('Workflow ID is required');
        if (!workflow.name) errors.push('Workflow name is required');
        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow must have steps array');
        }
        if (workflow.steps && workflow.steps.length === 0) {
            errors.push('Workflow must have at least one step');
        }

        // Step validation
        if (workflow.steps) {
            workflow.steps.forEach((step, index) => {
                if (!step.id) errors.push(`Step ${index} missing ID`);
                if (!step.type) errors.push(`Step ${index} missing type`);
                if (!step.action) errors.push(`Step ${index} missing action`);
                if (step.enabled === undefined) errors.push(`Step ${index} missing enabled flag`);
            });
        }

        // Security validation
        if (workflow.permissions && workflow.permissions.includes('admin')) {
            errors.push('Admin permissions not allowed for remote workflows');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Analyze workflow to determine optimal engine
     */
    private async analyzeWorkflow(workflow: RPAWorkflow): Promise<WorkflowAnalysis> {
        const analysis: WorkflowAnalysis = {
            isWebBased: false,
            isDesktopBased: false,
            requiresImageRecognition: false,
            requiresOCR: false,
            requiresHighPerformance: false,
            complexity: 'medium',
            estimatedDuration: 0,
            recommendedEngine: 'nutjs', // Default
            alternativeEngines: [],
            confidence: 50
        };

        // Analyze workflow steps
        let webSteps = 0;
        let desktopSteps = 0;
        let imageSteps = 0;
        let ocrSteps = 0;
        let totalComplexity = 0;

        workflow.steps.forEach(step => {
            switch (step.type) {
                case 'navigate-url':
                case 'click':
                    if (step.parameters?.selector?.startsWith('http')) {
                        webSteps++;
                    } else {
                        desktopSteps++;
                    }
                    totalComplexity += 2;
                    break;

                case 'screenshot':
                case 'extract-data':
                    imageSteps++;
                    totalComplexity += 3;
                    break;

                case 'read-text':
                    ocrSteps++;
                    totalComplexity += 4;
                    break;

                case 'open-application':
                    desktopSteps++;
                    totalComplexity += 3;
                    break;

                case 'type':
                    totalComplexity += 1;
                    break;

                case 'condition':
                case 'loop':
                    totalComplexity += 5;
                    break;

                default:
                    totalComplexity += 2;
            }
        });

        // Determine characteristics
        analysis.isWebBased = webSteps > desktopSteps;
        analysis.isDesktopBased = desktopSteps > webSteps;
        analysis.requiresImageRecognition = imageSteps > 0;
        analysis.requiresOCR = ocrSteps > 0;
        analysis.requiresHighPerformance = totalComplexity > 20 || workflow.steps.length > 10;

        // Determine complexity
        if (totalComplexity < 10) analysis.complexity = 'low';
        else if (totalComplexity < 30) analysis.complexity = 'medium';
        else analysis.complexity = 'high';

        // Estimate duration (rough heuristic)
        analysis.estimatedDuration = workflow.steps.length * 2000 + totalComplexity * 1000;

        // Recommend engine based on analysis
        if (analysis.isWebBased && this.engines.has('playwright')) {
            analysis.recommendedEngine = 'playwright';
            analysis.confidence = 85;
            analysis.alternativeEngines = ['nutjs'];
        } else if (analysis.requiresOCR && this.engines.has('nutjs')) {
            analysis.recommendedEngine = 'nutjs';
            analysis.confidence = 90;
            analysis.alternativeEngines = ['pyautogui'];
        } else if (analysis.isDesktopBased && this.engines.has('nutjs')) {
            analysis.recommendedEngine = 'nutjs';
            analysis.confidence = 80;
            analysis.alternativeEngines = ['pyautogui'];
        } else {
            // Fallback to first available engine
            const availableEngines = Array.from(this.engines.keys());
            if (availableEngines.length > 0) {
                analysis.recommendedEngine = availableEngines[0];
                analysis.confidence = 60;
                analysis.alternativeEngines = availableEngines.slice(1);
            }
        }

        return analysis;
    }

    /**
     * Select optimal engine based on analysis
     */
    private selectOptimalEngine(analysis: WorkflowAnalysis): IRPAEngine | null {
        // Try recommended engine first
        let engine = this.engines.get(analysis.recommendedEngine);
        if (engine && this.isEngineAvailable(analysis.recommendedEngine)) {
            return engine;
        }

        // Try alternative engines
        for (const engineType of analysis.alternativeEngines) {
            engine = this.engines.get(engineType);
            if (engine && this.isEngineAvailable(engineType)) {
                return engine;
            }
        }

        // Fallback to any available engine
        for (const [type, engine] of this.engines) {
            if (this.isEngineAvailable(type)) {
                return engine;
            }
        }

        return null;
    }

    /**
     * Check if engine is available for execution
     */
    private isEngineAvailable(engineType: RPAEngineType): boolean {
        const engine = this.engines.get(engineType);
        if (!engine) return false;

        const status = engine.getStatus();
        if (status.status !== 'ready' && status.status !== 'busy') return false;

        // Check concurrent execution limits
        const config = this.config.engines[engineType];
        const activeCount = Array.from(this.activeExecutions.values())
            .filter(tracker => tracker.engine === engineType && tracker.status === 'running')
            .length;

        return activeCount < config.maxConcurrentExecutions;
    }

    /**
     * Handle workflow progress updates
     */
    private handleProgress(executionId: string, progress: WorkflowProgress): void {
        this.emit('workflowProgress', {
            executionId,
            ...progress
        });

        this.log('debug', `📊 Workflow progress: ${progress.percentage}% (${executionId})`);
    }

    /**
     * Handle execution errors
     */
    private handleExecutionError(executionId: string, error: WorkflowError): void {
        this.emit('workflowError', {
            executionId,
            ...error
        });

        this.log('error', `❌ Workflow execution error (${executionId}):`, error.message);
    }

    /**
     * Record performance metrics for engine
     */
    private async recordPerformanceMetrics(
        engineType: RPAEngineType, 
        result: WorkflowResult, 
        startTime: Date
    ): Promise<void> {
        if (!this.config.enablePerformanceMetrics) return;

        const performance = this.enginePerformance.get(engineType) || {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            errorRate: 0,
            performanceScore: 100
        };

        // Update metrics
        performance.totalExecutions++;
        const executionTime = Date.now() - startTime.getTime();

        if (result.status === 'completed') {
            performance.successfulExecutions++;
        } else {
            performance.failedExecutions++;
        }

        // Calculate average execution time
        performance.averageExecutionTime = 
            (performance.averageExecutionTime * (performance.totalExecutions - 1) + executionTime) / 
            performance.totalExecutions;

        // Calculate error rate
        performance.errorRate = performance.failedExecutions / performance.totalExecutions;

        // Calculate performance score (0-100)
        const successRate = performance.successfulExecutions / performance.totalExecutions;
        const speedScore = Math.min(100, Math.max(0, 100 - (performance.averageExecutionTime / 10000)));
        performance.performanceScore = (successRate * 70) + (speedScore * 30);

        performance.lastExecution = new Date();

        this.enginePerformance.set(engineType, performance);
    }

    /**
     * Initialize performance tracking for all engines
     */
    private initializePerformanceTracking(): void {
        const engineTypes: RPAEngineType[] = ['nutjs', 'playwright', 'pyautogui'];
        
        engineTypes.forEach(type => {
            this.enginePerformance.set(type, {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                averageExecutionTime: 0,
                errorRate: 0,
                performanceScore: 100
            });
        });
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        // Handle process termination
        process.on('SIGTERM', () => {
            this.stopAllExecutions();
        });

        process.on('SIGINT', () => {
            this.stopAllExecutions();
        });
    }

    /**
     * Start health monitoring for all engines
     */
    private startHealthMonitoring(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 60000); // Check every minute

        this.log('info', '💊 Started engine health monitoring');
    }

    /**
     * Perform health check on all engines
     */
    private async performHealthCheck(): Promise<void> {
        try {
            for (const [type, engine] of this.engines) {
                const status = engine.getStatus();
                
                if (status.status === 'error' && this.config.enableAutoRecovery) {
                    this.log('warn', `⚠️ Engine ${type} in error state, attempting recovery...`);
                    await this.recoverEngine(type, engine);
                }
            }
        } catch (error) {
            this.log('error', '❌ Health check failed:', error);
        }
    }

    /**
     * Attempt to recover a failed engine
     */
    private async recoverEngine(type: RPAEngineType, engine: IRPAEngine): Promise<void> {
        try {
            this.log('info', `🔄 Attempting to recover engine: ${type}`);
            
            // Shutdown and reinitialize engine
            await engine.shutdown();
            
            // Wait a bit before reinitializing
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const config = this.config.engines[type];
            const success = await engine.initialize({
                logLevel: this.config.logLevel,
                timeout: config.timeout
            });
            
            if (success) {
                this.log('info', `✅ Successfully recovered engine: ${type}`);
            } else {
                this.log('error', `❌ Failed to recover engine: ${type}`);
                // Remove engine from available engines
                this.engines.delete(type);
            }
        } catch (error) {
            this.log('error', `❌ Engine recovery failed for ${type}:`, error);
            this.engines.delete(type);
        }
    }

    /**
     * Logging utility with configurable levels
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        const configLevel = logLevels[this.config.logLevel];
        const messageLevel = logLevels[level];
        
        if (messageLevel >= configLevel) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] [RPA-Controller] [${level.toUpperCase()}] ${message}`;
            
            if (data) {
                console.log(logMessage, data);
            } else {
                console.log(logMessage);
            }
        }
    }

    /**
     * Cleanup and shutdown all engines
     */
    public async shutdown(): Promise<void> {
        try {
            this.log('info', '🛑 Shutting down RPA Engine Controller...');

            // Stop health monitoring
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }

            // Stop all active executions
            await this.stopAllExecutions();

            // Shutdown all engines
            const shutdownPromises = Array.from(this.engines.values()).map(engine => 
                engine.shutdown().catch(error => {
                    this.log('error', 'Engine shutdown error:', error);
                })
            );

            await Promise.allSettled(shutdownPromises);

            // Clear engine references
            this.engines.clear();
            this.activeExecutions.clear();

            this.isInitialized = false;
            this.log('info', '✅ RPA Engine Controller shutdown complete');

        } catch (error) {
            this.log('error', '❌ Error during shutdown:', error);
        }
    }
}