/**
 * Sim Desktop Agent - Main Process
 * 
 * Enterprise-grade RPA desktop agent implementing secure automation capabilities
 * for the Sim platform. Features comprehensive security monitoring, multi-engine
 * RPA support, and real-time communication with the Sim server.
 * 
 * @fileoverview Main Electron process entry point with security-first architecture
 * @version 1.0.0
 * @author Sim Platform Development Team
 * @created 2025-09-05
 */

import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, protocol } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { machineIdSync } from 'node-machine-id';

// Internal imports
import { SecureElectronApp } from './security/secure-electron-app';
import { SecureSocketClient } from './services/secure-socket-client';
import { RPAEngineController } from './engines/rpa-engine-controller';
import { SecurityMonitor } from './security/security-monitor';
import { ConfigManager } from './services/config-manager';
import { DatabaseManager } from './services/database-manager';
import { LoggingService } from './services/logging-service';
import { UpdateManager } from './services/update-manager';
import { TrayManager } from './services/tray-manager';
import { MenuManager } from './services/menu-manager';
import { IPCHandlerManager } from './services/ipc-handler-manager';
import { DesktopAgentConfig, AgentCapabilities, ConnectionStatus } from './types/agent-types';

/**
 * Main Desktop Agent Application Class
 * 
 * Coordinates all agent components including security, RPA engines, communication,
 * and system integration. Implements enterprise-grade security and monitoring.
 */
class DesktopAgentApp {
    // Core components
    private secureApp: SecureElectronApp;
    private mainWindow: BrowserWindow | null = null;
    private socketClient: SecureSocketClient | null = null;
    private rpaEngine: RPAEngineController | null = null;
    private securityMonitor: SecurityMonitor;
    
    // Service managers
    private configManager: ConfigManager;
    private databaseManager: DatabaseManager;
    private loggingService: LoggingService;
    private updateManager: UpdateManager;
    private trayManager: TrayManager | null = null;
    private menuManager: MenuManager;
    private ipcHandler: IPCHandlerManager;
    
    // Application state
    private isInitialized = false;
    private agentId: string;
    private machineId: string;
    private connectionStatus: ConnectionStatus = 'disconnected';
    private capabilities: AgentCapabilities[] = [];
    private config: DesktopAgentConfig;

    constructor() {
        // Generate unique agent identifier
        this.machineId = machineIdSync();
        this.agentId = this.generateAgentId();
        
        // Initialize core services
        this.loggingService = new LoggingService();
        this.configManager = new ConfigManager();
        this.databaseManager = new DatabaseManager();
        this.secureApp = new SecureElectronApp();
        this.securityMonitor = new SecurityMonitor();
        this.updateManager = new UpdateManager();
        this.menuManager = new MenuManager();
        this.ipcHandler = new IPCHandlerManager();
        
        // Load configuration
        this.config = this.configManager.getConfig();
        
        // Setup application event handlers
        this.setupAppEventHandlers();
        this.setupProcessEventHandlers();
        
        this.loggingService.info('Desktop Agent initialized', {
            agentId: this.agentId,
            machineId: this.machineId,
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch
        });
    }

    /**
     * Initialize the Desktop Agent application
     * 
     * Performs secure initialization of all components including security monitoring,
     * RPA engines, database connection, and server communication.
     * 
     * @returns {Promise<boolean>} True if initialization successful
     */
    public async initialize(): Promise<boolean> {
        try {
            this.loggingService.info('Starting Desktop Agent initialization...');
            
            // Wait for Electron app to be ready
            await app.whenReady();
            
            // Initialize core services in dependency order
            await this.initializeCoreServices();
            await this.initializeDatabase();
            await this.initializeSecurityFramework();
            await this.initializeRPAEngines();
            await this.initializeUserInterface();
            await this.initializeServerCommunication();
            await this.initializeAutoUpdater();
            
            // Mark as initialized
            this.isInitialized = true;
            
            this.loggingService.info('Desktop Agent initialization completed successfully', {
                agentId: this.agentId,
                capabilities: this.capabilities,
                connectionStatus: this.connectionStatus
            });
            
            return true;
            
        } catch (error) {
            this.loggingService.error('Desktop Agent initialization failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            
            await this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Initialize core services required for basic operation
     */
    private async initializeCoreServices(): Promise<void> {
        this.loggingService.info('Initializing core services...');
        
        // Configure application security
        app.setAsDefaultProtocolClient('sim-desktop-agent');
        
        // Set application user model ID for Windows
        if (process.platform === 'win32') {
            app.setAppUserModelId('com.sim.desktop-agent');
        }
        
        // Configure Content Security Policy
        this.setupContentSecurityPolicy();
        
        // Initialize configuration manager
        await this.configManager.initialize();
        this.config = this.configManager.getConfig();
        
        this.loggingService.info('Core services initialized successfully');
    }

    /**
     * Initialize database connection and schema
     */
    private async initializeDatabase(): Promise<void> {
        this.loggingService.info('Initializing database...');
        
        const dbPath = path.join(app.getPath('userData'), 'agent-data.db');
        await this.databaseManager.initialize(dbPath);
        
        // Create required tables
        await this.databaseManager.createTables();
        
        // Store agent information
        await this.databaseManager.upsertAgentInfo({
            agentId: this.agentId,
            machineId: this.machineId,
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            lastStartup: new Date(),
            capabilities: this.getAgentCapabilities()
        });
        
        this.loggingService.info('Database initialized successfully');
    }

    /**
     * Initialize comprehensive security framework
     */
    private async initializeSecurityFramework(): Promise<void> {
        this.loggingService.info('Initializing security framework...');
        
        // Start security monitoring
        await this.securityMonitor.initialize();
        this.securityMonitor.startMonitoring();
        
        // Setup security event handlers
        this.securityMonitor.on('securityEvent', this.handleSecurityEvent.bind(this));
        this.securityMonitor.on('threatDetected', this.handleThreatDetection.bind(this));
        this.securityMonitor.on('violationThreshold', this.handleViolationThreshold.bind(this));
        
        // Initialize resource monitoring
        this.startResourceMonitoring();
        
        this.loggingService.info('Security framework initialized successfully');
    }

    /**
     * Initialize RPA automation engines
     */
    private async initializeRPAEngines(): Promise<void> {
        this.loggingService.info('Initializing RPA engines...');
        
        // Create RPA engine controller
        this.rpaEngine = new RPAEngineController({
            logLevel: this.config.rpa.logLevel,
            enablePerformanceMetrics: true,
            maxConcurrentExecutions: this.config.rpa.maxConcurrentExecutions,
            executionTimeout: this.config.rpa.executionTimeout
        });
        
        // Initialize supported engines
        const initSuccess = await this.rpaEngine.initializeEngines();
        
        if (!initSuccess) {
            throw new Error('Failed to initialize RPA engines');
        }
        
        // Get available capabilities
        this.capabilities = this.rpaEngine.getCapabilities();
        
        // Setup RPA event handlers
        this.rpaEngine.on('workflowStarted', this.handleWorkflowStarted.bind(this));
        this.rpaEngine.on('workflowProgress', this.handleWorkflowProgress.bind(this));
        this.rpaEngine.on('workflowCompleted', this.handleWorkflowCompleted.bind(this));
        this.rpaEngine.on('workflowError', this.handleWorkflowError.bind(this));
        
        this.loggingService.info('RPA engines initialized successfully', {
            capabilities: this.capabilities,
            engines: this.rpaEngine.getActiveEngines()
        });
    }

    /**
     * Initialize user interface components
     */
    private async initializeUserInterface(): Promise<void> {
        this.loggingService.info('Initializing user interface...');
        
        // Create main window
        this.mainWindow = this.secureApp.createSecureWindow();
        
        // Setup window event handlers
        this.setupWindowEventHandlers();
        
        // Create system tray
        this.trayManager = new TrayManager({
            onShowWindow: () => this.showMainWindow(),
            onHideWindow: () => this.hideMainWindow(),
            onQuit: () => this.gracefulShutdown(),
            onToggleConnection: () => this.toggleConnection()
        });
        
        await this.trayManager.initialize();
        this.updateTrayStatus();
        
        // Setup application menu
        this.menuManager.createApplicationMenu({
            onPreferences: () => this.showPreferences(),
            onAbout: () => this.showAbout(),
            onQuit: () => this.gracefulShutdown()
        });
        
        // Setup IPC handlers
        this.ipcHandler.setupHandlers({
            onGetAgentStatus: () => this.getAgentStatus(),
            onGetConfiguration: () => this.config,
            onUpdateConfiguration: (newConfig) => this.updateConfiguration(newConfig),
            onStartWorkflow: (workflow) => this.executeWorkflow(workflow),
            onStopWorkflow: (executionId) => this.stopWorkflow(executionId),
            onGetSystemInfo: () => this.getSystemInfo(),
            onToggleConnection: () => this.toggleConnection()
        });
        
        this.loggingService.info('User interface initialized successfully');
    }

    /**
     * Initialize server communication
     */
    private async initializeServerCommunication(): Promise<void> {
        this.loggingService.info('Initializing server communication...');
        
        // Create secure socket client
        this.socketClient = new SecureSocketClient(
            this.config.server.url,
            {
                timeout: this.config.server.timeout,
                reconnectionDelay: this.config.server.reconnectionDelay,
                maxReconnectionAttempts: this.config.server.maxReconnectionAttempts,
                encryptionEnabled: this.config.server.encryptionEnabled
            }
        );
        
        // Setup socket event handlers
        this.socketClient.on('connected', this.handleServerConnected.bind(this));
        this.socketClient.on('disconnected', this.handleServerDisconnected.bind(this));
        this.socketClient.on('authenticated', this.handleServerAuthenticated.bind(this));
        this.socketClient.on('authenticationError', this.handleAuthenticationError.bind(this));
        this.socketClient.on('rpaWorkflow', this.handleRemoteWorkflow.bind(this));
        this.socketClient.on('systemCommand', this.handleSystemCommand.bind(this));
        
        // Attempt initial connection if auto-connect is enabled
        if (this.config.server.autoConnect) {
            await this.connectToServer();
        }
        
        this.loggingService.info('Server communication initialized successfully');
    }

    /**
     * Initialize auto-updater
     */
    private async initializeAutoUpdater(): Promise<void> {
        this.loggingService.info('Initializing auto-updater...');
        
        await this.updateManager.initialize();
        
        // Setup update event handlers
        this.updateManager.on('updateAvailable', this.handleUpdateAvailable.bind(this));
        this.updateManager.on('updateDownloaded', this.handleUpdateDownloaded.bind(this));
        this.updateManager.on('updateError', this.handleUpdateError.bind(this));
        
        // Check for updates if enabled
        if (this.config.updates.autoCheck) {
            setTimeout(() => {
                this.updateManager.checkForUpdates();
            }, 5000); // Check after 5 seconds
        }
        
        this.loggingService.info('Auto-updater initialized successfully');
    }

    /**
     * Setup Electron application event handlers
     */
    private setupAppEventHandlers(): void {
        // Handle window-all-closed event
        app.on('window-all-closed', () => {
            // Keep app running on macOS unless explicitly quit
            if (process.platform !== 'darwin') {
                this.gracefulShutdown();
            }
        });

        // Handle activate event (macOS)
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0 || !this.mainWindow) {
                this.showMainWindow();
            } else {
                this.mainWindow.show();
                this.mainWindow.focus();
            }
        });

        // Handle before-quit event
        app.on('before-quit', async (event) => {
            if (!this.isShuttingDown) {
                event.preventDefault();
                await this.gracefulShutdown();
            }
        });

        // Handle certificate error
        app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
            this.handleCertificateError(event, url, error, certificate, callback);
        });

        // Handle web contents created
        app.on('web-contents-created', (event, contents) => {
            this.secureWebContents(contents);
        });
    }

    /**
     * Setup system process event handlers
     */
    private setupProcessEventHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.loggingService.error('Uncaught exception', {
                error: error.message,
                stack: error.stack
            });
            
            this.securityMonitor.logSecurityEvent({
                type: 'uncaught-exception',
                severity: 'high',
                error: error.message,
                stack: error.stack
            });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.loggingService.error('Unhandled promise rejection', {
                reason: reason instanceof Error ? reason.message : reason,
                stack: reason instanceof Error ? reason.stack : undefined
            });
            
            this.securityMonitor.logSecurityEvent({
                type: 'unhandled-rejection',
                severity: 'high',
                reason: reason instanceof Error ? reason.message : reason
            });
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            this.loggingService.info('Received SIGINT, initiating graceful shutdown');
            this.gracefulShutdown();
        });

        // Handle SIGTERM
        process.on('SIGTERM', () => {
            this.loggingService.info('Received SIGTERM, initiating graceful shutdown');
            this.gracefulShutdown();
        });
    }

    /**
     * Setup Content Security Policy
     */
    private setupContentSecurityPolicy(): void {
        protocol.registerSchemesAsPrivileged([
            {
                scheme: 'sim-agent',
                privileges: {
                    standard: true,
                    secure: true,
                    supportFetchAPI: true
                }
            }
        ]);
    }

    /**
     * Generate unique agent identifier
     */
    private generateAgentId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const platform = process.platform.substring(0, 3);
        return `sim-agent-${platform}-${timestamp}-${random}`;
    }

    /**
     * Get agent capabilities based on available engines
     */
    private getAgentCapabilities(): AgentCapabilities[] {
        const capabilities: AgentCapabilities[] = [
            'desktop-automation',
            'system-monitoring',
            'file-operations',
            'cross-platform-support'
        ];

        // Add capabilities based on available engines
        if (this.rpaEngine?.hasEngine('nutjs')) {
            capabilities.push('image-recognition', 'ocr-processing');
        }
        
        if (this.rpaEngine?.hasEngine('playwright')) {
            capabilities.push('web-automation');
        }

        return capabilities;
    }

    /**
     * Handle security events from security monitor
     */
    private handleSecurityEvent(event: any): void {
        this.loggingService.warn('Security event detected', event);
        
        // Report to server if connected
        if (this.socketClient?.isConnected()) {
            this.socketClient.emit('security-event', event);
        }
        
        // Store in database
        this.databaseManager.insertSecurityEvent(event);
    }

    /**
     * Handle threat detection
     */
    private handleThreatDetection(threat: any): void {
        this.loggingService.error('Threat detected', threat);
        
        // Immediate response based on threat severity
        if (threat.severity === 'critical') {
            this.initiateLockdown();
        }
        
        // Notify server immediately
        if (this.socketClient?.isConnected()) {
            this.socketClient.emit('threat-detected', threat);
        }
    }

    /**
     * Initiate security lockdown
     */
    private async initiateLockdown(): Promise<void> {
        this.loggingService.error('Initiating security lockdown');
        
        // Disconnect from server
        if (this.socketClient) {
            this.socketClient.disconnect();
        }
        
        // Stop all RPA executions
        if (this.rpaEngine) {
            await this.rpaEngine.stopAllExecutions();
        }
        
        // Hide main window
        if (this.mainWindow) {
            this.mainWindow.hide();
        }
        
        // Update connection status
        this.connectionStatus = 'locked';
        this.updateTrayStatus();
        
        // Show security alert
        dialog.showErrorBox(
            'Security Alert',
            'A critical security threat has been detected. The agent has been locked down for protection.'
        );
    }

    /**
     * Start resource monitoring
     */
    private startResourceMonitoring(): void {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            const metrics = {
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) // MB
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                uptime: process.uptime()
            };
            
            // Check for resource violations
            if (metrics.memory.heapUsed > this.config.monitoring.maxMemoryMB) {
                this.securityMonitor.logSecurityEvent({
                    type: 'resource-violation',
                    severity: 'medium',
                    message: 'High memory usage detected',
                    memoryUsage: metrics.memory.heapUsed
                });
            }
            
            // Update database with metrics
            this.databaseManager.insertSystemMetrics({
                agentId: this.agentId,
                timestamp: new Date(),
                ...metrics
            });
            
        }, this.config.monitoring.metricsInterval);
    }

    /**
     * Show main window
     */
    private showMainWindow(): void {
        if (!this.mainWindow) {
            this.mainWindow = this.secureApp.createSecureWindow();
            this.setupWindowEventHandlers();
        }
        
        this.mainWindow.show();
        this.mainWindow.focus();
        
        // Bring to front on macOS
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    }

    /**
     * Hide main window
     */
    private hideMainWindow(): void {
        if (this.mainWindow) {
            this.mainWindow.hide();
        }
        
        // Hide from dock on macOS
        if (process.platform === 'darwin') {
            app.dock.hide();
        }
    }

    /**
     * Setup main window event handlers
     */
    private setupWindowEventHandlers(): void {
        if (!this.mainWindow) return;
        
        this.mainWindow.on('close', (event) => {
            // Prevent closing, hide instead
            if (!this.isShuttingDown) {
                event.preventDefault();
                this.hideMainWindow();
            }
        });
        
        this.mainWindow.on('minimize', () => {
            this.hideMainWindow();
        });
        
        this.mainWindow.webContents.on('before-input-event', (event, input) => {
            // Handle keyboard shortcuts
            if (input.control && input.key.toLowerCase() === 'q') {
                this.gracefulShutdown();
            }
        });
    }

    /**
     * Update system tray status
     */
    private updateTrayStatus(): void {
        if (this.trayManager) {
            this.trayManager.updateStatus(this.connectionStatus, {
                agentId: this.agentId,
                capabilities: this.capabilities.length,
                rpaEngines: this.rpaEngine?.getActiveEngines().length || 0
            });
        }
    }

    /**
     * Connect to Sim server
     */
    private async connectToServer(): Promise<boolean> {
        if (!this.socketClient) return false;
        
        try {
            const credentials = await this.getServerCredentials();
            const success = await this.socketClient.connect(credentials);
            
            if (success) {
                this.connectionStatus = 'connected';
                this.updateTrayStatus();
            }
            
            return success;
        } catch (error) {
            this.loggingService.error('Failed to connect to server', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Get server authentication credentials
     */
    private async getServerCredentials(): Promise<any> {
        // In production, this would retrieve stored credentials securely
        return {
            token: this.config.server.authToken,
            agentId: this.agentId,
            machineId: this.machineId,
            capabilities: this.capabilities
        };
    }

    /**
     * Handle graceful shutdown
     */
    private isShuttingDown = false;
    
    private async gracefulShutdown(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        this.loggingService.info('Initiating graceful shutdown...');
        
        try {
            // Stop security monitoring
            if (this.securityMonitor) {
                this.securityMonitor.stopMonitoring();
            }
            
            // Stop all RPA executions
            if (this.rpaEngine) {
                await this.rpaEngine.stopAllExecutions();
            }
            
            // Disconnect from server
            if (this.socketClient) {
                this.socketClient.disconnect();
            }
            
            // Close database connection
            if (this.databaseManager) {
                await this.databaseManager.close();
            }
            
            // Save configuration
            if (this.configManager) {
                await this.configManager.saveConfig(this.config);
            }
            
            this.loggingService.info('Graceful shutdown completed');
            
        } catch (error) {
            this.loggingService.error('Error during shutdown', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            app.quit();
        }
    }

    /**
     * Handle initialization errors
     */
    private async handleInitializationError(error: any): Promise<void> {
        const message = error instanceof Error ? error.message : 'Unknown initialization error';
        
        dialog.showErrorBox(
            'Initialization Error',
            `Failed to initialize Desktop Agent: ${message}\n\nPlease check the logs and try again.`
        );
        
        await this.gracefulShutdown();
    }
}

// Application entry point
async function main(): Promise<void> {
    try {
        // Create and initialize the Desktop Agent
        const agent = new DesktopAgentApp();
        const initSuccess = await agent.initialize();
        
        if (!initSuccess) {
            process.exit(1);
        }
        
        console.log('🚀 Sim Desktop Agent started successfully');
        
    } catch (error) {
        console.error('❌ Failed to start Desktop Agent:', error);
        process.exit(1);
    }
}

// Start the application
main().catch((error) => {
    console.error('💥 Fatal error during startup:', error);
    process.exit(1);
});

// Export for testing
export { DesktopAgentApp };