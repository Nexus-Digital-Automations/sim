/**
 * Secure Electron Application Manager
 * 
 * Implements comprehensive security measures for Electron applications including
 * context isolation, process sandboxing, CSP enforcement, and security monitoring.
 * Based on 2025 Electron security best practices and enterprise requirements.
 * 
 * @fileoverview Secure Electron application configuration and management
 * @version 1.0.0
 */

import { BrowserWindow, app, session, shell, WebContents, ipcMain, dialog } from 'electron';
import path from 'path';
import { EventEmitter } from 'events';
import { SecurityMonitor } from './security-monitor';

/**
 * Secure Electron Application Class
 * 
 * Manages secure window creation, CSP enforcement, and security monitoring
 * for the Desktop Agent Electron application.
 */
export class SecureElectronApp extends EventEmitter {
    private securityMonitor: SecurityMonitor;
    private allowedOrigins: Set<string>;
    private blockedDomains: Set<string>;
    private activeWindows: Map<number, BrowserWindow>;
    
    /**
     * Security configuration for Electron windows
     */
    private readonly securityConfig = {
        // Core security settings
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        
        // Advanced security features  
        enableRemoteModule: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        
        // Additional protections
        enableWebSQL: false,
        enableBlinkFeatures: '',
        disableBlinkFeatures: 'Auxclick',
        
        // Content Security Policy
        additionalArguments: [
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox', // Only for development
            '--disable-dev-shm-usage'
        ]
    };

    constructor() {
        super();
        
        this.securityMonitor = new SecurityMonitor();
        this.activeWindows = new Map();
        
        // Initialize allowed origins
        this.allowedOrigins = new Set([
            'file://',
            'https://api.sim.platform',
            'https://sim.platform',
            'https://localhost:3000', // Development only
            'http://localhost:3000'   // Development only
        ]);
        
        // Initialize blocked domains
        this.blockedDomains = new Set([
            'malicious-site.com',
            'tracking-service.net',
            'adware-domain.org'
            // Add more blocked domains as needed
        ]);
        
        this.setupGlobalSecurityPolicies();
        this.setupSecurityEventHandlers();
    }

    /**
     * Create a secure browser window with comprehensive security settings
     * 
     * @param options - Additional window options
     * @returns Configured secure BrowserWindow
     */
    public createSecureWindow(options: Partial<Electron.BrowserWindowConstructorOptions> = {}): BrowserWindow {
        const defaultOptions: Electron.BrowserWindowConstructorOptions = {
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            
            // Security-focused window options
            show: false, // Start hidden for security initialization
            webSecurity: true,
            allowRunningInsecureContent: false,
            
            // Window styling and behavior
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            frame: true, // Keep frame for security indicators
            transparent: false,
            resizable: true,
            maximizable: true,
            minimizable: true,
            closable: true,
            fullscreenable: true,
            
            // Security icon and title
            title: 'Sim Desktop Agent',
            icon: this.getApplicationIcon(),
            
            webPreferences: {
                ...this.securityConfig,
                preload: path.join(__dirname, '../renderer/preload.js'),
                
                // Additional security context
                additionalArguments: [
                    '--disable-web-security=false',
                    '--enable-features=VizDisplayCompositor'
                ]
            }
        };

        // Merge options with security defaults
        const windowOptions = { ...defaultOptions, ...options };
        
        // Ensure security settings cannot be overridden
        if (windowOptions.webPreferences) {
            windowOptions.webPreferences = {
                ...windowOptions.webPreferences,
                ...this.securityConfig,
                preload: defaultOptions.webPreferences!.preload
            };
        }

        // Create the browser window
        const mainWindow = new BrowserWindow(windowOptions);
        
        // Store window reference
        this.activeWindows.set(mainWindow.id, mainWindow);
        
        // Apply comprehensive security configurations
        this.setupWindowSecurity(mainWindow);
        
        // Load the application
        this.loadSecureContent(mainWindow);
        
        // Setup window-specific event handlers
        this.setupWindowEventHandlers(mainWindow);
        
        // Start monitoring this window
        this.securityMonitor.monitorWindow(mainWindow);
        
        // Show window after security setup
        setTimeout(() => {
            mainWindow.show();
        }, 100);
        
        return mainWindow;
    }

    /**
     * Setup global security policies for the application
     */
    private setupGlobalSecurityPolicies(): void {
        // Set Content Security Policy
        app.whenReady().then(() => {
            this.setupContentSecurityPolicy();
            this.setupPermissionHandlers();
            this.setupProtocolHandlers();
        });
        
        // Handle certificate errors globally
        app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
            this.handleCertificateError(event, webContents, url, error, certificate, callback);
        });

        // Monitor web contents creation
        app.on('web-contents-created', (event, contents) => {
            this.secureWebContents(contents);
        });

        // Handle select client certificate
        app.on('select-client-certificate', (event, webContents, url, list, callback) => {
            event.preventDefault();
            // Implement certificate selection logic based on security policy
            callback(list[0]); // Select first available certificate
        });
    }

    /**
     * Setup Content Security Policy headers
     */
    private setupContentSecurityPolicy(): void {
        const cspHeader = this.generateCSPHeader();
        
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = details.responseHeaders || {};
            
            // Add CSP header
            responseHeaders['Content-Security-Policy'] = [cspHeader];
            
            // Add additional security headers
            responseHeaders['X-Content-Type-Options'] = ['nosniff'];
            responseHeaders['X-Frame-Options'] = ['DENY'];
            responseHeaders['X-XSS-Protection'] = ['1; mode=block'];
            responseHeaders['Strict-Transport-Security'] = ['max-age=31536000; includeSubDomains'];
            responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
            
            callback({ responseHeaders });
        });
    }

    /**
     * Generate comprehensive Content Security Policy header
     */
    private generateCSPHeader(): string {
        const cspDirectives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self'",
            "connect-src 'self' wss: https://api.sim.platform",
            "media-src 'self'",
            "object-src 'none'",
            "child-src 'none'",
            "frame-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "block-all-mixed-content",
            "upgrade-insecure-requests"
        ];
        
        return cspDirectives.join('; ');
    }

    /**
     * Setup permission request handlers
     */
    private setupPermissionHandlers(): void {
        session.defaultSession.setPermissionRequestHandler(
            (webContents, permission, callback, details) => {
                const allowedPermissions = [
                    'notifications',
                    'media',
                    'geolocation', // If needed for location-based automation
                    'fullscreen'
                ];
                
                const allowed = allowedPermissions.includes(permission);
                
                if (allowed) {
                    this.securityMonitor.logSecurityEvent({
                        type: 'permission-granted',
                        severity: 'low',
                        message: `Permission granted: ${permission}`,
                        details: { permission, url: details?.requestingUrl }
                    });
                } else {
                    this.securityMonitor.logSecurityEvent({
                        type: 'permission-denied',
                        severity: 'medium',
                        message: `Permission denied: ${permission}`,
                        details: { permission, url: details?.requestingUrl }
                    });
                }
                
                callback(allowed);
            }
        );

        // Handle permission check for specific permissions
        session.defaultSession.setPermissionCheckHandler(
            (webContents, permission, requestingOrigin, details) => {
                // Check if the requesting origin is allowed
                const isAllowedOrigin = Array.from(this.allowedOrigins).some(
                    origin => requestingOrigin.startsWith(origin)
                );
                
                if (!isAllowedOrigin) {
                    this.securityMonitor.logSecurityEvent({
                        type: 'unauthorized-permission-check',
                        severity: 'medium',
                        message: `Unauthorized permission check from: ${requestingOrigin}`,
                        details: { permission, requestingOrigin }
                    });
                    return false;
                }
                
                return true;
            }
        );
    }

    /**
     * Setup custom protocol handlers
     */
    private setupProtocolHandlers(): void {
        // Register secure protocol scheme
        session.defaultSession.protocol.registerStringProtocol('sim-agent', (request, callback) => {
            // Handle internal protocol requests securely
            const url = request.url;
            
            this.securityMonitor.logSecurityEvent({
                type: 'protocol-request',
                severity: 'low',
                message: `Protocol request: ${url}`,
                details: { url, method: request.method }
            });
            
            // Return appropriate content based on URL
            callback({ data: 'Secure protocol content', mimeType: 'text/html' });
        });
    }

    /**
     * Apply security configurations to a specific window
     */
    private setupWindowSecurity(window: BrowserWindow): void {
        const webContents = window.webContents;
        
        // Prevent navigation to unauthorized URLs
        webContents.on('will-navigate', (event, navigationUrl) => {
            const isAllowed = this.isUrlAllowed(navigationUrl);
            
            if (!isAllowed) {
                event.preventDefault();
                
                this.securityMonitor.logSecurityEvent({
                    type: 'unauthorized-navigation',
                    severity: 'medium',
                    message: `Blocked navigation to: ${navigationUrl}`,
                    details: { url: navigationUrl, windowId: window.id }
                });
                
                // Show warning to user
                dialog.showWarningBox(
                    'Security Warning',
                    `Navigation to ${navigationUrl} has been blocked for security reasons.`
                );
            }
        });

        // Prevent new window creation
        webContents.setWindowOpenHandler(({ url, frameName, features }) => {
            this.securityMonitor.logSecurityEvent({
                type: 'blocked-popup',
                severity: 'medium',
                message: `Blocked popup window: ${url}`,
                details: { url, frameName, features, windowId: window.id }
            });
            
            // Optionally allow specific URLs in external browser
            if (this.isUrlAllowed(url) && url.startsWith('https://')) {
                shell.openExternal(url);
            }
            
            return { action: 'deny' };
        });

        // Monitor DOM ready event
        webContents.on('dom-ready', () => {
            this.securityMonitor.logSecurityEvent({
                type: 'dom-ready',
                severity: 'low',
                message: 'DOM ready for window',
                details: { windowId: window.id, url: webContents.getURL() }
            });
        });

        // Handle console messages for security monitoring
        webContents.on('console-message', (event, level, message, line, sourceId) => {
            if (level >= 2) { // Warning and error levels
                this.securityMonitor.logSecurityEvent({
                    type: 'console-error',
                    severity: level >= 3 ? 'high' : 'medium',
                    message: `Console ${level >= 3 ? 'error' : 'warning'}: ${message}`,
                    details: { level, message, line, sourceId, windowId: window.id }
                });
            }
        });

        // Monitor before input events for security
        webContents.on('before-input-event', (event, input) => {
            // Log suspicious key combinations
            if (input.control && input.shift && input.key === 'I') {
                this.securityMonitor.logSecurityEvent({
                    type: 'dev-tools-attempt',
                    severity: 'low',
                    message: 'Attempt to open developer tools',
                    details: { key: input.key, windowId: window.id }
                });
            }
        });
    }

    /**
     * Load secure content into the window
     */
    private loadSecureContent(window: BrowserWindow): void {
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
            // Development: Load from local server
            const devUrl = 'http://localhost:3000';
            window.loadURL(devUrl);
            
            // Enable dev tools in development
            window.webContents.openDevTools();
        } else {
            // Production: Load from local file
            const prodPath = path.join(__dirname, '../renderer/index.html');
            window.loadFile(prodPath);
        }
    }

    /**
     * Setup window-specific event handlers
     */
    private setupWindowEventHandlers(window: BrowserWindow): void {
        // Handle window closed
        window.on('closed', () => {
            this.activeWindows.delete(window.id);
            this.securityMonitor.stopMonitoringWindow(window.id);
        });

        // Handle window moved (for multi-monitor security)
        window.on('moved', () => {
            const bounds = window.getBounds();
            
            this.securityMonitor.logSecurityEvent({
                type: 'window-moved',
                severity: 'low',
                message: 'Window position changed',
                details: { windowId: window.id, bounds }
            });
        });

        // Handle window focus events
        window.on('focus', () => {
            this.securityMonitor.logSecurityEvent({
                type: 'window-focus',
                severity: 'low',
                message: 'Window gained focus',
                details: { windowId: window.id }
            });
        });

        // Handle window blur events
        window.on('blur', () => {
            this.securityMonitor.logSecurityEvent({
                type: 'window-blur',
                severity: 'low',
                message: 'Window lost focus',
                details: { windowId: window.id }
            });
        });
    }

    /**
     * Apply security configurations to web contents
     */
    private secureWebContents(contents: WebContents): void {
        // Prevent context menu in production
        if (process.env.NODE_ENV !== 'development') {
            contents.on('context-menu', (event) => {
                event.preventDefault();
            });
        }

        // Handle crashed renderer process
        contents.on('render-process-gone', (event, details) => {
            this.securityMonitor.logSecurityEvent({
                type: 'renderer-crash',
                severity: 'high',
                message: `Renderer process crashed: ${details.reason}`,
                details: { reason: details.reason, exitCode: details.exitCode }
            });
            
            // Attempt to recover
            if (details.reason !== 'killed') {
                contents.reload();
            }
        });

        // Handle unresponsive renderer
        contents.on('unresponsive', () => {
            this.securityMonitor.logSecurityEvent({
                type: 'renderer-unresponsive',
                severity: 'medium',
                message: 'Renderer process became unresponsive'
            });
            
            // Show dialog to user
            dialog.showMessageBox({
                type: 'warning',
                title: 'Application Unresponsive',
                message: 'The application has become unresponsive. Would you like to restart it?',
                buttons: ['Restart', 'Wait']
            }).then((result) => {
                if (result.response === 0) { // Restart
                    contents.reload();
                }
            });
        });

        // Handle responsive renderer
        contents.on('responsive', () => {
            this.securityMonitor.logSecurityEvent({
                type: 'renderer-responsive',
                severity: 'low',
                message: 'Renderer process became responsive'
            });
        });
    }

    /**
     * Handle certificate errors with security policy
     */
    private handleCertificateError(
        event: Electron.Event,
        webContents: WebContents,
        url: string,
        error: string,
        certificate: Electron.Certificate,
        callback: (isTrusted: boolean) => void
    ): void {
        // Allow localhost certificates in development
        if (process.env.NODE_ENV === 'development' && 
            (url.includes('localhost') || url.includes('127.0.0.1'))) {
            
            this.securityMonitor.logSecurityEvent({
                type: 'certificate-exception',
                severity: 'low',
                message: `Allowed localhost certificate for development: ${url}`,
                details: { url, error }
            });
            
            event.preventDefault();
            callback(true);
            return;
        }
        
        // Log certificate error
        this.securityMonitor.logSecurityEvent({
            type: 'certificate-error',
            severity: 'high',
            message: `Certificate error for ${url}: ${error}`,
            details: { 
                url, 
                error, 
                issuer: certificate.issuer,
                subject: certificate.subject,
                fingerprint: certificate.fingerprint
            }
        });
        
        // Reject invalid certificates in production
        callback(false);
    }

    /**
     * Check if URL is allowed based on security policy
     */
    private isUrlAllowed(url: string): boolean {
        try {
            const urlObj = new URL(url);
            
            // Check blocked domains
            if (this.blockedDomains.has(urlObj.hostname)) {
                return false;
            }
            
            // Check allowed origins
            return Array.from(this.allowedOrigins).some(origin => {
                if (origin === 'file://') {
                    return url.startsWith('file://');
                }
                return url.startsWith(origin);
            });
            
        } catch (error) {
            // Invalid URL format
            return false;
        }
    }

    /**
     * Setup security event handlers
     */
    private setupSecurityEventHandlers(): void {
        this.securityMonitor.on('securityEvent', (event) => {
            this.emit('securityEvent', event);
        });

        this.securityMonitor.on('threatDetected', (threat) => {
            this.emit('threatDetected', threat);
            this.handleHighSeverityThreat(threat);
        });
    }

    /**
     * Handle high severity security threats
     */
    private handleHighSeverityThreat(threat: any): void {
        if (threat.severity === 'critical') {
            // Close all windows and show security alert
            this.activeWindows.forEach(window => {
                window.close();
            });
            
            dialog.showErrorBox(
                'Critical Security Threat',
                `A critical security threat has been detected: ${threat.message}\n\nThe application will now close for your protection.`
            );
            
            app.quit();
        }
    }

    /**
     * Get application icon path based on platform
     */
    private getApplicationIcon(): string {
        const iconName = process.platform === 'win32' ? 'icon.ico' : 
                        process.platform === 'darwin' ? 'icon.icns' : 
                        'icon.png';
        
        return path.join(__dirname, '../assets/icons', iconName);
    }

    /**
     * Get all active windows
     */
    public getActiveWindows(): BrowserWindow[] {
        return Array.from(this.activeWindows.values());
    }

    /**
     * Close all active windows securely
     */
    public closeAllWindows(): void {
        this.activeWindows.forEach(window => {
            window.close();
        });
    }

    /**
     * Update security configuration
     */
    public updateSecurityConfig(updates: Partial<typeof this.securityConfig>): void {
        Object.assign(this.securityConfig, updates);
        
        this.securityMonitor.logSecurityEvent({
            type: 'security-config-update',
            severity: 'medium',
            message: 'Security configuration updated',
            details: { updates }
        });
    }

    /**
     * Get current security status
     */
    public getSecurityStatus(): any {
        return {
            activeWindows: this.activeWindows.size,
            allowedOrigins: Array.from(this.allowedOrigins),
            blockedDomains: Array.from(this.blockedDomains),
            securityConfig: { ...this.securityConfig },
            monitoringActive: this.securityMonitor.isMonitoring()
        };
    }
}