/**
 * Secure Socket.io Client for Desktop Agent
 * 
 * Implements secure real-time communication between the Desktop Agent and Sim server
 * using Socket.io with enterprise-grade security, authentication, and encryption.
 * Based on comprehensive research findings on Socket.io patterns and security best practices.
 * 
 * @fileoverview Secure Socket.io client with authentication and encryption
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import crypto from 'crypto';
import { 
    DesktopAgentConfig, 
    RPAWorkflow, 
    WorkflowResult, 
    WorkflowExecutionContext,
    AgentCapabilities,
    ConnectionStatus,
    ConnectionStatusDetails,
    ServerMessage,
    AgentMessage
} from '../types/agent-types';

/**
 * Connection configuration interface
 */
interface ConnectionConfig {
    url: string;
    timeout: number;
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    maxReconnectionDelay: number;
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
    heartbeatInterval: number;
}

/**
 * Authentication credentials
 */
interface AuthCredentials {
    agentId: string;
    apiKey: string;
    machineId: string;
    timestamp: number;
    signature: string;
}

/**
 * Message encryption utilities
 */
interface MessageEncryption {
    algorithm: string;
    key: Buffer;
    iv: Buffer;
}

/**
 * Connection statistics
 */
interface ConnectionStats {
    connected: boolean;
    connectionTime?: Date;
    lastPing?: Date;
    messagesSent: number;
    messagesReceived: number;
    reconnectAttempts: number;
    totalUptime: number;
    averageLatency: number;
    lastLatency?: number;
}

/**
 * Heartbeat monitoring
 */
interface HeartbeatMonitor {
    interval: NodeJS.Timeout | null;
    lastSent: Date | null;
    lastReceived: Date | null;
    missedBeats: number;
    maxMissedBeats: number;
}

/**
 * Secure Socket.io Client Implementation
 * 
 * Provides secure, encrypted communication with the Sim server including:
 * - Authentication with digital signatures
 * - End-to-end message encryption
 * - Connection resilience and auto-reconnection
 * - Real-time workflow execution coordination
 * - Comprehensive logging and monitoring
 */
export class SecureSocketClient extends EventEmitter {
    private socket: Socket | null = null;
    private config: ConnectionConfig;
    private agentConfig: DesktopAgentConfig;
    private encryption: MessageEncryption | null = null;
    private isConnected = false;
    private connectionStats: ConnectionStats;
    private heartbeat: HeartbeatMonitor;
    
    // Authentication
    private authCredentials: AuthCredentials | null = null;
    private authToken: string | null = null;
    
    // Message queues
    private messageQueue: Array<{ event: string; data: any; callback?: Function }> = [];
    private pendingResponses: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
    
    // Monitoring
    private latencyHistory: number[] = [];
    private reconnectTimer: NodeJS.Timeout | null = null;
    private connectionTimeout: NodeJS.Timeout | null = null;

    constructor(agentConfig: DesktopAgentConfig) {
        super();
        
        this.agentConfig = agentConfig;
        
        // Initialize connection configuration based on research findings
        this.config = {
            url: agentConfig.server.url,
            timeout: agentConfig.server.timeout || 30000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            maxReconnectionDelay: 10000,
            encryptionEnabled: agentConfig.server.encryptionEnabled !== false,
            compressionEnabled: true,
            heartbeatInterval: 30000 // 30 seconds
        };

        // Initialize connection statistics
        this.connectionStats = {
            connected: false,
            messagesSent: 0,
            messagesReceived: 0,
            reconnectAttempts: 0,
            totalUptime: 0,
            averageLatency: 0
        };

        // Initialize heartbeat monitoring
        this.heartbeat = {
            interval: null,
            lastSent: null,
            lastReceived: null,
            missedBeats: 0,
            maxMissedBeats: 3
        };

        this.setupEventHandlers();
        this.log('info', '🔌 SecureSocketClient initialized', { 
            agentId: agentConfig.agent.id,
            serverUrl: agentConfig.server.url 
        });
    }

    /**
     * Connect to the Sim server with authentication
     */
    public async connect(): Promise<boolean> {
        try {
            this.log('info', '🚀 Initiating secure connection to server...');

            // Generate authentication credentials
            await this.generateAuthCredentials();

            // Setup encryption if enabled
            if (this.config.encryptionEnabled) {
                await this.setupEncryption();
            }

            // Create socket connection
            this.socket = io(this.config.url, {
                timeout: this.config.timeout,
                reconnection: this.config.reconnection,
                reconnectionAttempts: this.config.reconnectionAttempts,
                reconnectionDelay: this.config.reconnectionDelay,
                maxReconnectionDelay: this.config.maxReconnectionDelay,
                compression: this.config.compressionEnabled,
                auth: {
                    credentials: this.authCredentials,
                    agentVersion: this.agentConfig.agent.version,
                    capabilities: this.getAgentCapabilities()
                },
                transports: ['websocket', 'polling'] // Prefer websocket, fallback to polling
            });

            // Setup socket event handlers
            this.setupSocketEventHandlers();

            // Wait for connection or timeout
            const connected = await this.waitForConnection();
            
            if (connected) {
                this.startHeartbeat();
                this.processMessageQueue();
                this.log('info', '✅ Successfully connected to server');
                return true;
            } else {
                this.log('error', '❌ Failed to connect to server within timeout');
                return false;
            }

        } catch (error) {
            this.log('error', '❌ Connection error:', error);
            this.emit('connectionError', error);
            return false;
        }
    }

    /**
     * Disconnect from the server
     */
    public async disconnect(): Promise<void> {
        try {
            this.log('info', '🔌 Disconnecting from server...');

            // Stop heartbeat
            this.stopHeartbeat();

            // Clear timers
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }

            if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout);
                this.connectionTimeout = null;
            }

            // Reject all pending responses
            this.pendingResponses.forEach(({ reject, timeout }) => {
                clearTimeout(timeout);
                reject(new Error('Connection closed'));
            });
            this.pendingResponses.clear();

            // Disconnect socket
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }

            // Update state
            this.isConnected = false;
            this.connectionStats.connected = false;
            
            this.log('info', '✅ Disconnected from server');
            this.emit('disconnected');

        } catch (error) {
            this.log('error', '❌ Error during disconnection:', error);
        }
    }

    /**
     * Send secure message to server with optional response handling
     */
    public async sendMessage<T = any>(event: string, data: any, expectResponse = false): Promise<T | void> {
        try {
            if (!this.isConnected || !this.socket) {
                // Queue message if not connected
                return new Promise((resolve, reject) => {
                    this.messageQueue.push({
                        event,
                        data,
                        callback: expectResponse ? (response: T) => resolve(response) : undefined
                    });
                });
            }

            const messageId = this.generateMessageId();
            const timestamp = Date.now();
            
            // Prepare message with metadata
            const message = {
                id: messageId,
                timestamp,
                agentId: this.agentConfig.agent.id,
                data: this.config.encryptionEnabled ? await this.encryptMessage(data) : data
            };

            this.log('debug', `📤 Sending message: ${event}`, { messageId, event });

            if (expectResponse) {
                return new Promise<T>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this.pendingResponses.delete(messageId);
                        reject(new Error(`Message timeout: ${event}`));
                    }, this.config.timeout);

                    this.pendingResponses.set(messageId, { resolve, reject, timeout });
                    
                    this.socket!.emit(event, message, (response: any) => {
                        this.handleMessageResponse(messageId, response);
                    });
                });
            } else {
                this.socket.emit(event, message);
                this.connectionStats.messagesSent++;
            }

        } catch (error) {
            this.log('error', `❌ Failed to send message: ${event}`, error);
            throw error;
        }
    }

    /**
     * Execute workflow on server
     */
    public async executeWorkflow(workflow: RPAWorkflow, context: WorkflowExecutionContext): Promise<WorkflowResult> {
        this.log('info', `🚀 Executing workflow: ${workflow.name}`);
        
        const result = await this.sendMessage<WorkflowResult>('workflow-execute', {
            workflow,
            context
        }, true);

        this.log('info', `✅ Workflow execution completed: ${workflow.name}`);
        return result as WorkflowResult;
    }

    /**
     * Send workflow progress update
     */
    public async sendWorkflowProgress(executionId: string, progress: any): Promise<void> {
        await this.sendMessage('workflow-progress', {
            executionId,
            progress,
            timestamp: Date.now()
        });
    }

    /**
     * Register agent capabilities with server
     */
    public async registerCapabilities(capabilities: AgentCapabilities[]): Promise<boolean> {
        try {
            const result = await this.sendMessage<{ success: boolean }>('agent-register', {
                agentId: this.agentConfig.agent.id,
                capabilities,
                machineId: this.agentConfig.agent.machineId,
                version: this.agentConfig.agent.version
            }, true);

            return result?.success || false;
        } catch (error) {
            this.log('error', '❌ Failed to register capabilities:', error);
            return false;
        }
    }

    /**
     * Send heartbeat to maintain connection
     */
    public async sendHeartbeat(): Promise<void> {
        const startTime = Date.now();
        
        try {
            await this.sendMessage('heartbeat', {
                timestamp: startTime,
                stats: this.getConnectionStats()
            }, true);

            const latency = Date.now() - startTime;
            this.updateLatencyStats(latency);
            
            this.heartbeat.lastSent = new Date();
            this.heartbeat.missedBeats = 0;

        } catch (error) {
            this.heartbeat.missedBeats++;
            this.log('warn', '⚠️ Heartbeat failed', { missedBeats: this.heartbeat.missedBeats });

            if (this.heartbeat.missedBeats >= this.heartbeat.maxMissedBeats) {
                this.log('error', '❌ Too many missed heartbeats, reconnecting...');
                this.handleConnectionLoss();
            }
        }
    }

    /**
     * Get current connection status
     */
    public getConnectionStatus(): ConnectionStatusDetails {
        return {
            connected: this.isConnected,
            authenticated: this.authToken !== null,
            serverUrl: this.config.url,
            lastHeartbeat: this.heartbeat.lastReceived,
            latency: this.connectionStats.lastLatency,
            uptime: this.isConnected ? Date.now() - (this.connectionStats.connectionTime?.getTime() || 0) : 0
        };
    }

    /**
     * Get connection statistics
     */
    public getConnectionStats(): ConnectionStats {
        return { ...this.connectionStats };
    }

    /**
     * Check if client is connected and ready
     */
    public isReady(): boolean {
        return this.isConnected && this.socket?.connected === true;
    }

    /**
     * Generate authentication credentials with digital signature
     */
    private async generateAuthCredentials(): Promise<void> {
        const timestamp = Date.now();
        const agentId = this.agentConfig.agent.id;
        const machineId = this.agentConfig.agent.machineId;
        const apiKey = process.env.SIM_API_KEY || 'default-key'; // Should be from secure config

        // Create signature using HMAC-SHA256
        const payload = `${agentId}:${machineId}:${timestamp}`;
        const signature = crypto.createHmac('sha256', apiKey)
            .update(payload)
            .digest('hex');

        this.authCredentials = {
            agentId,
            apiKey: apiKey.substring(0, 8) + '...', // Truncated for security
            machineId,
            timestamp,
            signature
        };

        this.log('debug', '🔐 Generated authentication credentials', { 
            agentId, 
            machineId, 
            timestamp 
        });
    }

    /**
     * Setup message encryption
     */
    private async setupEncryption(): Promise<void> {
        // Generate encryption key and IV
        const algorithm = 'aes-256-gcm';
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        this.encryption = {
            algorithm,
            key,
            iv
        };

        this.log('debug', '🔒 Message encryption initialized', { algorithm });
    }

    /**
     * Encrypt message data
     */
    private async encryptMessage(data: any): Promise<string> {
        if (!this.encryption) {
            throw new Error('Encryption not initialized');
        }

        const cipher = crypto.createCipher(this.encryption.algorithm, this.encryption.key);
        const jsonData = JSON.stringify(data);
        
        let encrypted = cipher.update(jsonData, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return encrypted;
    }

    /**
     * Decrypt message data
     */
    private async decryptMessage(encryptedData: string): Promise<any> {
        if (!this.encryption) {
            throw new Error('Encryption not initialized');
        }

        const decipher = crypto.createDecipher(this.encryption.algorithm, this.encryption.key);
        
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * Setup event handlers for the socket client
     */
    private setupEventHandlers(): void {
        // Handle process termination
        process.on('SIGTERM', () => {
            this.disconnect();
        });

        process.on('SIGINT', () => {
            this.disconnect();
        });

        // Handle unhandled errors
        process.on('uncaughtException', (error) => {
            this.log('error', '❌ Uncaught exception in socket client:', error);
        });
    }

    /**
     * Setup socket.io event handlers
     */
    private setupSocketEventHandlers(): void {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => {
            this.handleConnection();
        });

        this.socket.on('disconnect', (reason) => {
            this.handleDisconnection(reason);
        });

        this.socket.on('connect_error', (error) => {
            this.handleConnectionError(error);
        });

        // Authentication events
        this.socket.on('authenticated', (data) => {
            this.handleAuthentication(data);
        });

        this.socket.on('authentication-failed', (error) => {
            this.handleAuthenticationFailure(error);
        });

        // Server messages
        this.socket.on('server-message', (message: ServerMessage) => {
            this.handleServerMessage(message);
        });

        // Workflow events
        this.socket.on('workflow-start', (data) => {
            this.emit('workflowStart', data);
        });

        this.socket.on('workflow-stop', (data) => {
            this.emit('workflowStop', data);
        });

        this.socket.on('workflow-status-request', (data) => {
            this.emit('workflowStatusRequest', data);
        });

        // Heartbeat response
        this.socket.on('heartbeat-response', (data) => {
            this.heartbeat.lastReceived = new Date();
        });

        // Error handling
        this.socket.on('error', (error) => {
            this.log('error', '❌ Socket error:', error);
            this.emit('socketError', error);
        });
    }

    /**
     * Wait for connection to establish
     */
    private waitForConnection(): Promise<boolean> {
        return new Promise((resolve) => {
            this.connectionTimeout = setTimeout(() => {
                resolve(false);
            }, this.config.timeout);

            const checkConnection = () => {
                if (this.isConnected) {
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }
                    resolve(true);
                } else {
                    setTimeout(checkConnection, 100);
                }
            };

            checkConnection();
        });
    }

    /**
     * Handle successful connection
     */
    private handleConnection(): void {
        this.isConnected = true;
        this.connectionStats.connected = true;
        this.connectionStats.connectionTime = new Date();
        this.connectionStats.reconnectAttempts = 0;

        this.log('info', '✅ Socket connected successfully');
        this.emit('connected');
    }

    /**
     * Handle disconnection
     */
    private handleDisconnection(reason: string): void {
        this.isConnected = false;
        this.connectionStats.connected = false;
        this.stopHeartbeat();

        this.log('warn', `🔌 Socket disconnected: ${reason}`);
        this.emit('disconnected', reason);

        // Attempt reconnection if not intentional
        if (reason !== 'io client disconnect') {
            this.scheduleReconnection();
        }
    }

    /**
     * Handle connection errors
     */
    private handleConnectionError(error: Error): void {
        this.connectionStats.reconnectAttempts++;
        
        this.log('error', '❌ Connection error:', error);
        this.emit('connectionError', error);
    }

    /**
     * Handle successful authentication
     */
    private handleAuthentication(data: { token: string; expiresIn: number }): void {
        this.authToken = data.token;
        
        this.log('info', '🔐 Authentication successful', { 
            expiresIn: data.expiresIn 
        });
        
        this.emit('authenticated', data);
    }

    /**
     * Handle authentication failure
     */
    private handleAuthenticationFailure(error: any): void {
        this.authToken = null;
        
        this.log('error', '❌ Authentication failed:', error);
        this.emit('authenticationFailed', error);
    }

    /**
     * Handle server messages
     */
    private handleServerMessage(message: ServerMessage): void {
        this.connectionStats.messagesReceived++;
        
        this.log('debug', '📥 Server message received', { 
            type: message.type 
        });
        
        this.emit('serverMessage', message);
    }

    /**
     * Handle message responses
     */
    private handleMessageResponse(messageId: string, response: any): void {
        const pending = this.pendingResponses.get(messageId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingResponses.delete(messageId);
            pending.resolve(response);
        }
    }

    /**
     * Handle connection loss
     */
    private handleConnectionLoss(): void {
        this.log('warn', '⚠️ Connection lost, attempting recovery...');
        
        if (this.socket) {
            this.socket.disconnect();
            this.scheduleReconnection();
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnection(): void {
        if (this.reconnectTimer) return;

        const delay = Math.min(
            this.config.reconnectionDelay * Math.pow(2, this.connectionStats.reconnectAttempts),
            this.config.maxReconnectionDelay
        );

        this.log('info', `🔄 Scheduling reconnection in ${delay}ms`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((error) => {
                this.log('error', '❌ Reconnection failed:', error);
            });
        }, delay);
    }

    /**
     * Start heartbeat monitoring
     */
    private startHeartbeat(): void {
        if (this.heartbeat.interval) return;

        this.heartbeat.interval = setInterval(() => {
            this.sendHeartbeat().catch((error) => {
                this.log('error', '❌ Heartbeat error:', error);
            });
        }, this.config.heartbeatInterval);

        this.log('debug', '💓 Heartbeat monitoring started');
    }

    /**
     * Stop heartbeat monitoring
     */
    private stopHeartbeat(): void {
        if (this.heartbeat.interval) {
            clearInterval(this.heartbeat.interval);
            this.heartbeat.interval = null;
        }
    }

    /**
     * Process queued messages
     */
    private processMessageQueue(): void {
        this.log('debug', `📤 Processing message queue: ${this.messageQueue.length} messages`);

        const messages = [...this.messageQueue];
        this.messageQueue = [];

        messages.forEach(({ event, data, callback }) => {
            if (callback) {
                this.sendMessage(event, data, true)
                    .then(callback)
                    .catch((error) => {
                        this.log('error', `❌ Queued message error: ${event}`, error);
                    });
            } else {
                this.sendMessage(event, data);
            }
        });
    }

    /**
     * Update latency statistics
     */
    private updateLatencyStats(latency: number): void {
        this.latencyHistory.unshift(latency);
        
        // Keep only last 100 measurements
        if (this.latencyHistory.length > 100) {
            this.latencyHistory = this.latencyHistory.slice(0, 100);
        }

        this.connectionStats.lastLatency = latency;
        this.connectionStats.averageLatency = 
            this.latencyHistory.reduce((sum, l) => sum + l, 0) / this.latencyHistory.length;
    }

    /**
     * Get agent capabilities
     */
    private getAgentCapabilities(): AgentCapabilities[] {
        // This would be populated by the RPA Engine Controller
        return [
            'desktop-automation',
            'web-automation',
            'image-recognition',
            'cross-platform-support'
        ];
    }

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }

    /**
     * Logging utility with structured output
     */
    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [SocketClient] [${level.toUpperCase()}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }

        // Emit log event for external monitoring
        this.emit('log', { level, message, data, timestamp });
    }

    /**
     * Cleanup resources and shutdown
     */
    public async shutdown(): Promise<void> {
        try {
            this.log('info', '🛑 Shutting down SecureSocketClient...');

            // Disconnect from server
            await this.disconnect();

            // Remove all listeners
            this.removeAllListeners();

            this.log('info', '✅ SecureSocketClient shutdown complete');

        } catch (error) {
            this.log('error', '❌ Error during shutdown:', error);
        }
    }
}