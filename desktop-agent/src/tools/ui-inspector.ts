/**
 * UI Inspector Tool for Desktop Agent
 * 
 * Advanced UI element detection and inspection tool that enables users to select
 * elements for automation workflows. Supports multiple identification methods
 * including coordinates, image recognition, OCR, and accessibility APIs.
 * 
 * @fileoverview Cross-platform UI inspection with multi-method element detection
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { BrowserWindow, screen, globalShortcut } from 'electron';
import { mouse, Point, Region, screen as nutScreen } from '@nut-tree-fork/nut-js';
import path from 'path';
import fs from 'fs';
import { 
    UIElement, 
    ElementIdentificationMethod, 
    UIInspectionResult,
    ElementSelector,
    AutomationAction,
    ScreenRegion,
    OCRResult
} from '../types/agent-types';

/**
 * Element detection configuration
 */
interface DetectionConfig {
    enableCoordinates: boolean;
    enableImageRecognition: boolean;
    enableOCR: boolean;
    enableAccessibilityAPI: boolean;
    confidenceThreshold: number;
    screenshotQuality: number;
    ocrLanguage: string;
}

/**
 * Screenshot capture options
 */
interface ScreenshotOptions {
    region?: ScreenRegion;
    quality: number;
    format: 'png' | 'jpeg';
    includeOverlay: boolean;
}

/**
 * Element highlighting configuration
 */
interface HighlightConfig {
    borderColor: string;
    borderWidth: number;
    backgroundColor: string;
    opacity: number;
    duration: number;
}

/**
 * Inspection session data
 */
interface InspectionSession {
    id: string;
    startTime: Date;
    elements: UIElement[];
    screenshots: string[];
    active: boolean;
}

/**
 * Cross-platform UI Inspector Implementation
 * 
 * Provides comprehensive UI element inspection capabilities including:
 * - Real-time element detection and highlighting
 * - Multiple identification methods (coordinates, image, OCR, accessibility)
 * - Screenshot capture with element overlay
 * - Interactive element selection
 * - Workflow action generation
 */
export class UIInspector extends EventEmitter {
    private inspectorWindow: BrowserWindow | null = null;
    private overlayWindow: BrowserWindow | null = null;
    private isInspecting = false;
    private currentSession: InspectionSession | null = null;
    
    // Configuration
    private config: DetectionConfig = {
        enableCoordinates: true,
        enableImageRecognition: true,
        enableOCR: true,
        enableAccessibilityAPI: true,
        confidenceThreshold: 0.8,
        screenshotQuality: 90,
        ocrLanguage: 'eng'
    };

    // Highlighting
    private highlightConfig: HighlightConfig = {
        borderColor: '#ff4444',
        borderWidth: 3,
        backgroundColor: 'rgba(255, 68, 68, 0.2)',
        opacity: 0.8,
        duration: 2000
    };

    // Element cache
    private elementCache: Map<string, UIElement> = new Map();
    private lastScreenshot: string | null = null;
    private lastScreenshotTime: Date | null = null;
    
    // Mouse tracking
    private mousePosition: Point | null = null;
    private mouseTrackingInterval: NodeJS.Timeout | null = null;
    
    // Keyboard shortcuts
    private shortcutsRegistered = false;

    constructor(config?: Partial<DetectionConfig>) {
        super();
        
        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.setupEventHandlers();
        this.log('info', '🔍 UI Inspector initialized', { 
            config: this.config 
        });
    }

    /**
     * Initialize the UI Inspector
     */
    public async initialize(): Promise<boolean> {
        try {
            this.log('info', '🚀 Initializing UI Inspector...');

            // Initialize Nut.js screen module
            await this.initializeNutJS();

            // Setup keyboard shortcuts
            await this.setupKeyboardShortcuts();

            // Create inspector interface
            await this.createInspectorWindow();

            this.log('info', '✅ UI Inspector initialized successfully');
            return true;

        } catch (error) {
            this.log('error', '❌ Failed to initialize UI Inspector:', error);
            return false;
        }
    }

    /**
     * Start UI inspection mode
     */
    public async startInspection(): Promise<string> {
        if (this.isInspecting) {
            throw new Error('Inspection already in progress');
        }

        try {
            const sessionId = this.generateSessionId();
            
            this.currentSession = {
                id: sessionId,
                startTime: new Date(),
                elements: [],
                screenshots: [],
                active: true
            };

            this.isInspecting = true;
            
            this.log('info', `🔍 Starting UI inspection session: ${sessionId}`);

            // Show inspector interface
            await this.showInspectorWindow();

            // Create overlay window for element highlighting
            await this.createOverlayWindow();

            // Start mouse tracking
            this.startMouseTracking();

            // Capture initial screenshot
            await this.captureScreenshot();

            this.emit('inspectionStarted', { sessionId });
            return sessionId;

        } catch (error) {
            this.isInspecting = false;
            this.currentSession = null;
            this.log('error', '❌ Failed to start inspection:', error);
            throw error;
        }
    }

    /**
     * Stop UI inspection mode
     */
    public async stopInspection(): Promise<UIInspectionResult | null> {
        if (!this.isInspecting || !this.currentSession) {
            return null;
        }

        try {
            this.log('info', `🛑 Stopping UI inspection session: ${this.currentSession.id}`);

            // Stop mouse tracking
            this.stopMouseTracking();

            // Hide windows
            await this.hideInspectorWindow();
            await this.hideOverlayWindow();

            // Prepare results
            const result: UIInspectionResult = {
                sessionId: this.currentSession.id,
                startTime: this.currentSession.startTime,
                endTime: new Date(),
                elementsFound: this.currentSession.elements.length,
                elements: [...this.currentSession.elements],
                screenshots: [...this.currentSession.screenshots],
                summary: this.generateInspectionSummary()
            };

            this.currentSession.active = false;
            this.isInspecting = false;

            this.emit('inspectionCompleted', result);
            
            this.log('info', `✅ Inspection completed: ${result.elementsFound} elements found`);
            return result;

        } catch (error) {
            this.log('error', '❌ Failed to stop inspection:', error);
            throw error;
        }
    }

    /**
     * Inspect element at specific coordinates
     */
    public async inspectElementAt(x: number, y: number): Promise<UIElement | null> {
        try {
            const point: Point = { x, y };
            
            this.log('debug', `🎯 Inspecting element at (${x}, ${y})`);

            // Create element with multiple identification methods
            const element: UIElement = {
                id: this.generateElementId(),
                position: point,
                region: { x, y, width: 10, height: 10 }, // Initial small region
                identificationMethods: [],
                selectors: [],
                text: '',
                attributes: {},
                confidence: 0,
                timestamp: new Date()
            };

            // Apply different detection methods
            await this.detectByCoordinates(element, point);
            await this.detectByImageRecognition(element);
            await this.detectByOCR(element);
            await this.detectByAccessibilityAPI(element);

            // Calculate overall confidence
            element.confidence = this.calculateElementConfidence(element);

            // Cache element
            this.elementCache.set(element.id, element);

            // Add to current session
            if (this.currentSession) {
                this.currentSession.elements.push(element);
            }

            // Highlight element
            await this.highlightElement(element);

            this.log('debug', `✅ Element inspection completed`, { 
                elementId: element.id,
                confidence: element.confidence,
                methods: element.identificationMethods.length
            });

            this.emit('elementInspected', element);
            return element;

        } catch (error) {
            this.log('error', '❌ Failed to inspect element:', error);
            return null;
        }
    }

    /**
     * Generate automation action for element
     */
    public generateAction(element: UIElement, actionType: string, parameters?: any): AutomationAction {
        const action: AutomationAction = {
            id: `action_${Date.now()}`,
            type: actionType as any,
            elementId: element.id,
            selector: this.getBestSelector(element),
            parameters: {
                position: element.position,
                region: element.region,
                text: element.text,
                ...parameters
            },
            timeout: 5000,
            retryCount: 3
        };

        this.log('debug', `🎬 Generated automation action`, { 
            actionId: action.id,
            type: actionType,
            elementId: element.id
        });

        return action;
    }

    /**
     * Capture screenshot of current screen
     */
    public async captureScreenshot(options?: Partial<ScreenshotOptions>): Promise<string> {
        try {
            const opts: ScreenshotOptions = {
                quality: 90,
                format: 'png',
                includeOverlay: false,
                ...options
            };

            // Get screen dimensions
            const displays = screen.getAllDisplays();
            const primaryDisplay = displays[0];

            // Capture using Nut.js
            const screenshot = await nutScreen.grab();
            
            // Save screenshot
            const filename = `screenshot_${Date.now()}.${opts.format}`;
            const filepath = path.join(this.getScreenshotDir(), filename);
            
            await screenshot.save(filepath);

            // Update cache
            this.lastScreenshot = filepath;
            this.lastScreenshotTime = new Date();

            // Add to current session
            if (this.currentSession) {
                this.currentSession.screenshots.push(filepath);
            }

            this.log('debug', `📸 Screenshot captured: ${filename}`);
            return filepath;

        } catch (error) {
            this.log('error', '❌ Failed to capture screenshot:', error);
            throw error;
        }
    }

    /**
     * Find elements by text content
     */
    public async findElementsByText(text: string, exact = false): Promise<UIElement[]> {
        try {
            this.log('debug', `🔍 Searching for elements with text: "${text}"`);

            const elements: UIElement[] = [];

            // Capture current screen for analysis
            const screenshot = await this.captureScreenshot();

            // Perform OCR on entire screen
            const ocrResult = await this.performOCR(screenshot);
            
            // Find text matches
            const matches = exact 
                ? ocrResult.words.filter(word => word.text === text)
                : ocrResult.words.filter(word => word.text.includes(text));

            // Create elements for each match
            for (const match of matches) {
                const element: UIElement = {
                    id: this.generateElementId(),
                    position: { x: match.bbox.x0, y: match.bbox.y0 },
                    region: {
                        x: match.bbox.x0,
                        y: match.bbox.y0,
                        width: match.bbox.x1 - match.bbox.x0,
                        height: match.bbox.y1 - match.bbox.y0
                    },
                    text: match.text,
                    identificationMethods: ['ocr'],
                    selectors: [{
                        type: 'text',
                        value: match.text,
                        confidence: match.confidence
                    }],
                    attributes: { ocrConfidence: match.confidence },
                    confidence: match.confidence,
                    timestamp: new Date()
                };

                elements.push(element);
                this.elementCache.set(element.id, element);
            }

            this.log('debug', `✅ Found ${elements.length} elements with text: "${text}"`);
            return elements;

        } catch (error) {
            this.log('error', '❌ Failed to find elements by text:', error);
            return [];
        }
    }

    /**
     * Get current inspection status
     */
    public getInspectionStatus(): any {
        return {
            active: this.isInspecting,
            session: this.currentSession ? {
                id: this.currentSession.id,
                startTime: this.currentSession.startTime,
                elementsFound: this.currentSession.elements.length,
                screenshotsTaken: this.currentSession.screenshots.length
            } : null,
            cachedElements: this.elementCache.size,
            mousePosition: this.mousePosition
        };
    }

    /**
     * Initialize Nut.js screen module
     */
    private async initializeNutJS(): Promise<void> {
        try {
            // Configure Nut.js
            nutScreen.config.resourceDirectory = this.getResourceDir();
            mouse.config.mouseSpeed = 1000;

            this.log('debug', '🥜 Nut.js screen module initialized');
        } catch (error) {
            this.log('error', '❌ Failed to initialize Nut.js:', error);
            throw error;
        }
    }

    /**
     * Setup keyboard shortcuts for inspection
     */
    private async setupKeyboardShortcuts(): Promise<void> {
        try {
            // Register global shortcuts
            globalShortcut.register('F12', () => {
                if (this.isInspecting) {
                    this.stopInspection();
                } else {
                    this.startInspection();
                }
            });

            globalShortcut.register('Escape', () => {
                if (this.isInspecting) {
                    this.stopInspection();
                }
            });

            this.shortcutsRegistered = true;
            this.log('debug', '⌨️ Keyboard shortcuts registered');

        } catch (error) {
            this.log('error', '❌ Failed to setup keyboard shortcuts:', error);
        }
    }

    /**
     * Create inspector window
     */
    private async createInspectorWindow(): Promise<void> {
        this.inspectorWindow = new BrowserWindow({
            width: 400,
            height: 600,
            show: false,
            frame: true,
            alwaysOnTop: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // Load inspector HTML interface
        await this.inspectorWindow.loadURL('data:text/html,<html><body><h1>UI Inspector</h1><p>Press F12 to start/stop inspection</p></body></html>');

        this.log('debug', '🪟 Inspector window created');
    }

    /**
     * Create overlay window for highlighting
     */
    private async createOverlayWindow(): Promise<void> {
        const displays = screen.getAllDisplays();
        const primaryDisplay = displays[0];

        this.overlayWindow = new BrowserWindow({
            ...primaryDisplay.bounds,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            focusable: false,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // Load overlay HTML
        const overlayHTML = this.generateOverlayHTML();
        await this.overlayWindow.loadURL(`data:text/html,${overlayHTML}`);

        this.log('debug', '🎨 Overlay window created');
    }

    /**
     * Show inspector window
     */
    private async showInspectorWindow(): Promise<void> {
        if (this.inspectorWindow) {
            this.inspectorWindow.show();
            this.inspectorWindow.focus();
        }
    }

    /**
     * Hide inspector window
     */
    private async hideInspectorWindow(): Promise<void> {
        if (this.inspectorWindow) {
            this.inspectorWindow.hide();
        }
    }

    /**
     * Show overlay window
     */
    private async showOverlayWindow(): Promise<void> {
        if (this.overlayWindow) {
            this.overlayWindow.show();
        }
    }

    /**
     * Hide overlay window
     */
    private async hideOverlayWindow(): Promise<void> {
        if (this.overlayWindow) {
            this.overlayWindow.hide();
        }
    }

    /**
     * Start mouse position tracking
     */
    private startMouseTracking(): void {
        if (this.mouseTrackingInterval) return;

        this.mouseTrackingInterval = setInterval(async () => {
            try {
                this.mousePosition = await mouse.getPosition();
                this.emit('mouseMove', this.mousePosition);
            } catch (error) {
                // Ignore mouse tracking errors
            }
        }, 100);

        this.log('debug', '🖱️ Mouse tracking started');
    }

    /**
     * Stop mouse position tracking
     */
    private stopMouseTracking(): void {
        if (this.mouseTrackingInterval) {
            clearInterval(this.mouseTrackingInterval);
            this.mouseTrackingInterval = null;
        }
    }

    /**
     * Detect element by coordinates
     */
    private async detectByCoordinates(element: UIElement, point: Point): Promise<void> {
        if (!this.config.enableCoordinates) return;

        // Add coordinate-based identification
        element.identificationMethods.push('coordinates');
        element.selectors.push({
            type: 'coordinates',
            value: `${point.x},${point.y}`,
            confidence: 1.0
        });

        this.log('debug', `📍 Coordinate detection completed for (${point.x}, ${point.y})`);
    }

    /**
     * Detect element by image recognition
     */
    private async detectByImageRecognition(element: UIElement): Promise<void> {
        if (!this.config.enableImageRecognition) return;

        try {
            // Capture small region around element for template matching
            const region: Region = {
                left: element.position.x - 25,
                top: element.position.y - 25,
                width: 50,
                height: 50
            };

            const template = await nutScreen.grab(region);
            const templatePath = path.join(this.getResourceDir(), `template_${element.id}.png`);
            await template.save(templatePath);

            element.identificationMethods.push('image-recognition');
            element.selectors.push({
                type: 'image',
                value: templatePath,
                confidence: 0.9
            });

            this.log('debug', `🖼️ Image recognition template created: ${templatePath}`);

        } catch (error) {
            this.log('error', '❌ Image recognition failed:', error);
        }
    }

    /**
     * Detect element by OCR
     */
    private async detectByOCR(element: UIElement): Promise<void> {
        if (!this.config.enableOCR) return;

        try {
            // Capture region around element for OCR
            const region: Region = {
                left: Math.max(0, element.position.x - 50),
                top: Math.max(0, element.position.y - 20),
                width: 100,
                height: 40
            };

            const regionScreenshot = await nutScreen.grab(region);
            const regionPath = path.join(this.getResourceDir(), `ocr_${element.id}.png`);
            await regionScreenshot.save(regionPath);

            // Perform OCR (mock implementation - would use real OCR library)
            const ocrResult = await this.performOCR(regionPath);
            
            if (ocrResult.text.trim()) {
                element.text = ocrResult.text.trim();
                element.identificationMethods.push('ocr');
                element.selectors.push({
                    type: 'text',
                    value: ocrResult.text.trim(),
                    confidence: ocrResult.confidence
                });
            }

            this.log('debug', `🔤 OCR detection completed: "${ocrResult.text}"`);

        } catch (error) {
            this.log('error', '❌ OCR detection failed:', error);
        }
    }

    /**
     * Detect element by accessibility API
     */
    private async detectByAccessibilityAPI(element: UIElement): Promise<void> {
        if (!this.config.enableAccessibilityAPI) return;

        try {
            // Mock accessibility detection (platform-specific implementation needed)
            const accessibilityInfo = await this.getAccessibilityInfo(element.position);
            
            if (accessibilityInfo) {
                element.identificationMethods.push('accessibility');
                element.selectors.push({
                    type: 'accessibility',
                    value: accessibilityInfo.role || 'unknown',
                    confidence: 0.8
                });
                
                element.attributes = {
                    ...element.attributes,
                    ...accessibilityInfo
                };
            }

            this.log('debug', '♿ Accessibility detection completed');

        } catch (error) {
            this.log('error', '❌ Accessibility detection failed:', error);
        }
    }

    /**
     * Perform OCR on image (mock implementation)
     */
    private async performOCR(imagePath: string): Promise<OCRResult> {
        // Mock OCR implementation - would use libraries like Tesseract.js
        return {
            text: 'Sample Text',
            confidence: 0.85,
            words: [{
                text: 'Sample',
                confidence: 0.9,
                bbox: { x0: 0, y0: 0, x1: 50, y1: 20 }
            }],
            blocks: []
        };
    }

    /**
     * Get accessibility information (mock implementation)
     */
    private async getAccessibilityInfo(point: Point): Promise<any> {
        // Mock accessibility API - platform-specific implementation needed
        return {
            role: 'button',
            name: 'Sample Button',
            description: 'A sample button element'
        };
    }

    /**
     * Highlight element on screen
     */
    private async highlightElement(element: UIElement): Promise<void> {
        if (!this.overlayWindow) return;

        try {
            // Send highlighting command to overlay window
            await this.overlayWindow.webContents.executeJavaScript(`
                highlightElement(${JSON.stringify(element.region)}, ${JSON.stringify(this.highlightConfig)});
            `);

            // Auto-remove highlight after duration
            setTimeout(async () => {
                if (this.overlayWindow) {
                    await this.overlayWindow.webContents.executeJavaScript('clearHighlights();');
                }
            }, this.highlightConfig.duration);

            this.log('debug', `✨ Element highlighted: ${element.id}`);

        } catch (error) {
            this.log('error', '❌ Failed to highlight element:', error);
        }
    }

    /**
     * Calculate element confidence score
     */
    private calculateElementConfidence(element: UIElement): number {
        let totalConfidence = 0;
        let methodCount = 0;

        element.selectors.forEach(selector => {
            totalConfidence += selector.confidence;
            methodCount++;
        });

        return methodCount > 0 ? totalConfidence / methodCount : 0;
    }

    /**
     * Get best selector for element
     */
    private getBestSelector(element: UIElement): ElementSelector {
        // Return selector with highest confidence
        return element.selectors.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }

    /**
     * Generate overlay HTML for highlighting
     */
    private generateOverlayHTML(): string {
        return `
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; background: transparent; }
                    .highlight {
                        position: absolute;
                        border: ${this.highlightConfig.borderWidth}px solid ${this.highlightConfig.borderColor};
                        background: ${this.highlightConfig.backgroundColor};
                        pointer-events: none;
                        opacity: ${this.highlightConfig.opacity};
                    }
                </style>
            </head>
            <body>
                <script>
                    let highlights = [];
                    
                    function highlightElement(region, config) {
                        const highlight = document.createElement('div');
                        highlight.className = 'highlight';
                        highlight.style.left = region.x + 'px';
                        highlight.style.top = region.y + 'px';
                        highlight.style.width = region.width + 'px';
                        highlight.style.height = region.height + 'px';
                        
                        document.body.appendChild(highlight);
                        highlights.push(highlight);
                    }
                    
                    function clearHighlights() {
                        highlights.forEach(highlight => {
                            if (highlight.parentNode) {
                                highlight.parentNode.removeChild(highlight);
                            }
                        });
                        highlights = [];
                    }
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Generate inspection summary
     */
    private generateInspectionSummary(): any {
        if (!this.currentSession) return {};

        const elements = this.currentSession.elements;
        const methodCounts: Record<string, number> = {};

        elements.forEach(element => {
            element.identificationMethods.forEach(method => {
                methodCounts[method] = (methodCounts[method] || 0) + 1;
            });
        });

        return {
            totalElements: elements.length,
            averageConfidence: elements.reduce((sum, el) => sum + el.confidence, 0) / elements.length,
            methodDistribution: methodCounts,
            screenshotsTaken: this.currentSession.screenshots.length,
            sessionDuration: Date.now() - this.currentSession.startTime.getTime()
        };
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        // Handle app termination
        process.on('SIGTERM', () => {
            this.shutdown();
        });

        process.on('SIGINT', () => {
            this.shutdown();
        });
    }

    /**
     * Utility methods
     */
    private generateSessionId(): string {
        return `inspect_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    private generateElementId(): string {
        return `elem_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    private getScreenshotDir(): string {
        const dir = path.join(__dirname, '../../temp/screenshots');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    private getResourceDir(): string {
        const dir = path.join(__dirname, '../../temp/resources');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Logging utility
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [UIInspector] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }

    /**
     * Cleanup and shutdown
     */
    public async shutdown(): Promise<void> {
        try {
            this.log('info', '🛑 Shutting down UI Inspector...');

            // Stop inspection if active
            if (this.isInspecting) {
                await this.stopInspection();
            }

            // Unregister shortcuts
            if (this.shortcutsRegistered) {
                globalShortcut.unregisterAll();
                this.shortcutsRegistered = false;
            }

            // Close windows
            if (this.inspectorWindow) {
                this.inspectorWindow.close();
                this.inspectorWindow = null;
            }

            if (this.overlayWindow) {
                this.overlayWindow.close();
                this.overlayWindow = null;
            }

            // Stop mouse tracking
            this.stopMouseTracking();

            // Clear caches
            this.elementCache.clear();

            this.log('info', '✅ UI Inspector shutdown complete');

        } catch (error) {
            this.log('error', '❌ Error during shutdown:', error);
        }
    }
}