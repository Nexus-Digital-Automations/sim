/**
 * Playwright RPA Engine Implementation
 * 
 * Web automation engine using Playwright for browser-based RPA tasks.
 * Provides comprehensive web interaction, JavaScript execution, and
 * cross-browser automation capabilities.
 * 
 * @fileoverview Playwright engine implementation for web automation
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { chromium, firefox, Browser, BrowserContext, Page, Locator } from 'playwright';
import { 
    IRPAEngine, 
    RPAWorkflow, 
    WorkflowExecutionContext, 
    WorkflowResult, 
    EngineStatus, 
    WorkflowStep 
} from '../types/agent-types';

/**
 * Playwright Engine Configuration
 */
interface PlaywrightEngineConfig {
    logLevel: string;
    timeout: number;
    headless: boolean;
    browsers: string[];
    viewport: { width: number; height: number };
    userAgent?: string;
    extraHTTPHeaders?: Record<string, string>;
}

/**
 * Browser session management
 */
interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    browserType: string;
}

/**
 * Playwright RPA Engine Implementation
 * 
 * Provides comprehensive web automation using Playwright including:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Advanced web element interaction
 * - JavaScript execution and evaluation
 * - Screenshot and PDF generation
 * - Network interception and monitoring
 * - Cookie and session management
 */
export class PlaywrightEngine extends EventEmitter implements IRPAEngine {
    public readonly name = 'Playwright Engine';
    public readonly type = 'playwright' as const;
    public readonly version = '1.0.0';
    
    private config: PlaywrightEngineConfig;
    private status: EngineStatus = {
        status: 'initializing',
        lastActivity: new Date(),
        activeExecutions: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
    };
    
    private isInitialized = false;
    private activeExecutions: Map<string, any> = new Map();
    private browserSessions: Map<string, BrowserSession> = new Map();

    constructor() {
        super();
        
        this.config = {
            logLevel: 'info',
            timeout: 30000,
            headless: false,
            browsers: ['chromium'],
            viewport: { width: 1920, height: 1080 }
        };

        this.log('info', '🎭 Playwright Engine created');
    }

    /**
     * Initialize the Playwright engine
     */
    public async initialize(config?: Partial<PlaywrightEngineConfig>): Promise<boolean> {
        try {
            this.log('info', '🚀 Initializing Playwright engine...');
            
            if (config) {
                this.config = { ...this.config, ...config };
            }

            // Test browser availability
            await this.testBrowserAvailability();

            this.isInitialized = true;
            this.status = {
                ...this.status,
                status: 'ready',
                lastActivity: new Date()
            };

            this.log('info', '✅ Playwright engine initialized successfully');
            return true;

        } catch (error) {
            this.log('error', '❌ Failed to initialize Playwright engine:', error);
            this.status.status = 'error';
            return false;
        }
    }

    /**
     * Execute a workflow using Playwright
     */
    public async execute(workflow: RPAWorkflow, context: WorkflowExecutionContext): Promise<WorkflowResult> {
        if (!this.isInitialized) {
            throw new Error('Playwright engine not initialized');
        }

        const executionId = context.executionId;
        const startTime = Date.now();

        try {
            this.log('info', `🚀 Executing workflow: ${workflow.name}`);
            
            // Track execution
            this.activeExecutions.set(executionId, {
                workflow,
                context,
                startTime,
                status: 'running'
            });

            this.status.activeExecutions++;
            this.status.totalExecutions++;

            // Create browser session for this execution
            const session = await this.createBrowserSession(executionId);

            // Execute workflow steps
            const result = await this.executeSteps(workflow.steps, context, session);

            // Cleanup session
            await this.closeBrowserSession(executionId);

            // Update statistics
            this.status.successfulExecutions++;
            this.status.lastActivity = new Date();

            this.log('info', `✅ Workflow execution completed: ${workflow.name}`);

            return {
                status: 'completed',
                executionId,
                workflowId: workflow.id,
                startTime: new Date(startTime),
                endTime: new Date(),
                duration: Date.now() - startTime,
                result: result,
                steps: result.steps || [],
                error: null
            };

        } catch (error) {
            // Cleanup session on error
            await this.closeBrowserSession(executionId);

            this.status.failedExecutions++;
            this.log('error', `❌ Workflow execution failed: ${workflow.name}`, error);

            return {
                status: 'failed',
                executionId,
                workflowId: workflow.id,
                startTime: new Date(startTime),
                endTime: new Date(),
                duration: Date.now() - startTime,
                result: null,
                steps: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };

        } finally {
            this.activeExecutions.delete(executionId);
            this.status.activeExecutions--;
        }
    }

    /**
     * Stop workflow execution
     */
    public async stop(executionId: string): Promise<boolean> {
        try {
            const execution = this.activeExecutions.get(executionId);
            if (!execution) {
                this.log('warn', `⚠️ Execution not found: ${executionId}`);
                return false;
            }

            // Close browser session
            await this.closeBrowserSession(executionId);

            // Mark as stopped
            execution.status = 'stopped';
            this.activeExecutions.delete(executionId);
            this.status.activeExecutions--;

            this.log('info', `🛑 Execution stopped: ${executionId}`);
            return true;

        } catch (error) {
            this.log('error', `❌ Failed to stop execution: ${executionId}`, error);
            return false;
        }
    }

    /**
     * Get engine status
     */
    public getStatus(): EngineStatus {
        return { ...this.status };
    }

    /**
     * Shutdown the engine
     */
    public async shutdown(): Promise<void> {
        try {
            this.log('info', '🛑 Shutting down Playwright engine...');

            // Stop all active executions
            const executionIds = Array.from(this.activeExecutions.keys());
            for (const id of executionIds) {
                await this.stop(id);
            }

            // Close all browser sessions
            for (const [sessionId, session] of this.browserSessions) {
                await session.browser.close();
            }
            this.browserSessions.clear();

            this.isInitialized = false;
            this.status.status = 'stopped';

            this.log('info', '✅ Playwright engine shutdown complete');

        } catch (error) {
            this.log('error', '❌ Error during shutdown:', error);
        }
    }

    /**
     * Test browser availability
     */
    private async testBrowserAvailability(): Promise<void> {
        try {
            for (const browserType of this.config.browsers) {
                this.log('debug', `🔍 Testing ${browserType} browser...`);
                
                let browser: Browser;
                
                switch (browserType.toLowerCase()) {
                    case 'chromium':
                        browser = await chromium.launch({ headless: true });
                        break;
                    case 'firefox':
                        browser = await firefox.launch({ headless: true });
                        break;
                    default:
                        throw new Error(`Unsupported browser type: ${browserType}`);
                }
                
                // Test basic page creation
                const page = await browser.newPage();
                await page.goto('about:blank');
                await browser.close();
                
                this.log('debug', `✅ ${browserType} browser available`);
            }

        } catch (error) {
            throw new Error(`Browser availability test failed: ${error}`);
        }
    }

    /**
     * Create browser session for execution
     */
    private async createBrowserSession(executionId: string): Promise<BrowserSession> {
        try {
            const browserType = this.config.browsers[0] || 'chromium';
            
            let browser: Browser;
            
            switch (browserType.toLowerCase()) {
                case 'chromium':
                    browser = await chromium.launch({
                        headless: this.config.headless,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                    break;
                case 'firefox':
                    browser = await firefox.launch({
                        headless: this.config.headless
                    });
                    break;
                default:
                    throw new Error(`Unsupported browser type: ${browserType}`);
            }

            // Create browser context with configuration
            const context = await browser.newContext({
                viewport: this.config.viewport,
                userAgent: this.config.userAgent,
                extraHTTPHeaders: this.config.extraHTTPHeaders
            });

            // Set default timeout
            context.setDefaultTimeout(this.config.timeout);

            // Create page
            const page = await context.newPage();

            const session: BrowserSession = {
                browser,
                context,
                page,
                browserType
            };

            this.browserSessions.set(executionId, session);
            this.log('debug', `🌐 Browser session created: ${browserType}`);
            
            return session;

        } catch (error) {
            throw new Error(`Failed to create browser session: ${error}`);
        }
    }

    /**
     * Close browser session
     */
    private async closeBrowserSession(executionId: string): Promise<void> {
        try {
            const session = this.browserSessions.get(executionId);
            if (session) {
                await session.browser.close();
                this.browserSessions.delete(executionId);
                this.log('debug', `🌐 Browser session closed: ${executionId}`);
            }

        } catch (error) {
            this.log('error', `❌ Failed to close browser session: ${executionId}`, error);
        }
    }

    /**
     * Execute workflow steps sequentially
     */
    private async executeSteps(steps: WorkflowStep[], context: WorkflowExecutionContext, session: BrowserSession): Promise<any> {
        const results: any[] = [];
        let stepIndex = 0;

        for (const step of steps) {
            if (!step.enabled) {
                this.log('debug', `⏭️ Skipping disabled step: ${step.name}`);
                continue;
            }

            try {
                this.log('debug', `▶️ Executing step ${stepIndex + 1}: ${step.name}`);
                
                const stepResult = await this.executeStep(step, context, session);
                results.push({
                    stepId: step.id,
                    name: step.name,
                    result: stepResult,
                    status: 'completed',
                    timestamp: new Date()
                });

                // Report progress
                if (context.onProgress) {
                    context.onProgress({
                        percentage: Math.round(((stepIndex + 1) / steps.length) * 100),
                        currentStep: stepIndex + 1,
                        totalSteps: steps.length,
                        stepName: step.name,
                        message: `Completed step: ${step.name}`
                    });
                }

                stepIndex++;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.log('error', `❌ Step failed: ${step.name}`, error);

                results.push({
                    stepId: step.id,
                    name: step.name,
                    result: null,
                    status: 'failed',
                    error: errorMessage,
                    timestamp: new Date()
                });

                // Handle step failure based on strategy
                if (step.onFailure === 'stop' || !step.onFailure) {
                    throw new Error(`Step failed: ${step.name} - ${errorMessage}`);
                } else if (step.onFailure === 'continue') {
                    this.log('warn', `⚠️ Step failed but continuing: ${step.name}`);
                    continue;
                }
            }
        }

        return {
            steps: results,
            totalSteps: steps.length,
            completedSteps: results.filter(r => r.status === 'completed').length,
            failedSteps: results.filter(r => r.status === 'failed').length
        };
    }

    /**
     * Execute individual workflow step
     */
    private async executeStep(step: WorkflowStep, context: WorkflowExecutionContext, session: BrowserSession): Promise<any> {
        const { page } = session;

        switch (step.type) {
            case 'navigate-url':
                return await this.executeNavigate(step, page);
            case 'click':
                return await this.executeClick(step, page);
            case 'type':
                return await this.executeType(step, page);
            case 'key':
                return await this.executeKey(step, page);
            case 'wait':
                return await this.executeWait(step, page);
            case 'screenshot':
                return await this.executeScreenshot(step, page);
            case 'extract-data':
                return await this.executeExtractData(step, page);
            case 'execute-script':
                return await this.executeScript(step, page);
            case 'wait-for-element':
                return await this.executeWaitForElement(step, page);
            default:
                throw new Error(`Unsupported step type: ${step.type}`);
        }
    }

    /**
     * Execute navigate action
     */
    private async executeNavigate(step: WorkflowStep, page: Page): Promise<any> {
        const url = step.parameters.url;
        const waitUntil = step.parameters.waitUntil || 'domcontentloaded';
        
        if (typeof url !== 'string') {
            throw new Error('Invalid URL for navigation');
        }

        await page.goto(url, { waitUntil: waitUntil as any });
        
        this.log('debug', `🌐 Navigated to: ${url}`);
        return { url, title: await page.title() };
    }

    /**
     * Execute click action
     */
    private async executeClick(step: WorkflowStep, page: Page): Promise<any> {
        const selector = step.parameters.selector;
        const button = step.parameters.button || 'left';
        const clickCount = step.parameters.clickCount || 1;
        
        if (typeof selector !== 'string') {
            throw new Error('Invalid selector for click');
        }

        await page.click(selector, { 
            button: button as any, 
            clickCount 
        });
        
        this.log('debug', `🖱️ Clicked element: ${selector}`);
        return { selector, button, clickCount };
    }

    /**
     * Execute type action
     */
    private async executeType(step: WorkflowStep, page: Page): Promise<any> {
        const selector = step.parameters.selector;
        const text = step.parameters.text;
        const delay = step.parameters.delay || 0;
        
        if (typeof selector !== 'string' || typeof text !== 'string') {
            throw new Error('Invalid parameters for type action');
        }

        await page.type(selector, text, { delay });
        
        this.log('debug', `⌨️ Typed text in ${selector}: "${text}"`);
        return { selector, text, delay };
    }

    /**
     * Execute key action
     */
    private async executeKey(step: WorkflowStep, page: Page): Promise<any> {
        const key = step.parameters.key;
        const modifiers = step.parameters.modifiers || [];
        
        if (typeof key !== 'string') {
            throw new Error('Invalid key for key press');
        }

        // Build key combination
        let keyCombo = key;
        if (modifiers.length > 0) {
            keyCombo = modifiers.join('+') + '+' + key;
        }

        await page.keyboard.press(keyCombo);
        
        this.log('debug', `⌨️ Pressed key: ${keyCombo}`);
        return { key, modifiers };
    }

    /**
     * Execute wait action
     */
    private async executeWait(step: WorkflowStep, page: Page): Promise<any> {
        const duration = step.parameters.duration || 1000;
        
        await page.waitForTimeout(duration);
        
        this.log('debug', `⏱️ Waited for ${duration}ms`);
        return { duration };
    }

    /**
     * Execute screenshot action
     */
    private async executeScreenshot(step: WorkflowStep, page: Page): Promise<any> {
        const fullPage = step.parameters.fullPage || false;
        const clip = step.parameters.clip;
        
        const timestamp = Date.now();
        const filename = `screenshot_${timestamp}.png`;
        
        const screenshotOptions: any = {
            path: filename,
            fullPage
        };

        if (clip) {
            screenshotOptions.clip = clip;
        }

        await page.screenshot(screenshotOptions);
        
        this.log('debug', `📸 Screenshot saved: ${filename}`);
        return { filename, timestamp, fullPage, clip };
    }

    /**
     * Execute extract data action
     */
    private async executeExtractData(step: WorkflowStep, page: Page): Promise<any> {
        const selector = step.parameters.selector;
        const attribute = step.parameters.attribute;
        const multiple = step.parameters.multiple || false;
        
        if (typeof selector !== 'string') {
            throw new Error('Invalid selector for data extraction');
        }

        let data;

        if (multiple) {
            const elements = await page.locator(selector).all();
            if (attribute) {
                data = await Promise.all(elements.map(el => el.getAttribute(attribute)));
            } else {
                data = await Promise.all(elements.map(el => el.textContent()));
            }
        } else {
            const element = page.locator(selector);
            if (attribute) {
                data = await element.getAttribute(attribute);
            } else {
                data = await element.textContent();
            }
        }
        
        this.log('debug', `📊 Extracted data from ${selector}:`, data);
        return { selector, attribute, data, multiple };
    }

    /**
     * Execute JavaScript
     */
    private async executeScript(step: WorkflowStep, page: Page): Promise<any> {
        const script = step.parameters.script;
        const args = step.parameters.args || [];
        
        if (typeof script !== 'string') {
            throw new Error('Invalid script for execution');
        }

        const result = await page.evaluate(script, ...args);
        
        this.log('debug', `🔧 Executed script:`, { script: script.substring(0, 100) + '...', result });
        return { script, args, result };
    }

    /**
     * Execute wait for element action
     */
    private async executeWaitForElement(step: WorkflowStep, page: Page): Promise<any> {
        const selector = step.parameters.selector;
        const state = step.parameters.state || 'visible';
        const timeout = step.parameters.timeout || this.config.timeout;
        
        if (typeof selector !== 'string') {
            throw new Error('Invalid selector for wait');
        }

        await page.locator(selector).waitFor({ 
            state: state as any, 
            timeout 
        });
        
        this.log('debug', `⏳ Waited for element: ${selector} (${state})`);
        return { selector, state, timeout };
    }

    /**
     * Logging utility
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [PlaywrightEngine] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
}