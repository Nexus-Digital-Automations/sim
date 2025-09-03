import { spawn, ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('DockerManager')

/**
 * Docker Manager for Secure Code Execution
 * 
 * Provides secure, isolated Docker container execution for untrusted code with:
 * - Container lifecycle management
 * - Resource limits and monitoring
 * - Security policy enforcement
 * - Network isolation controls
 * - File system protection
 * - Execution timeout handling
 * - Container pool management for performance
 */

export interface ContainerConfig {
  image: string
  memory: number // bytes
  cpuShares: number // relative CPU weight
  timeout: number // milliseconds
  readOnly: boolean
  networkMode: 'none' | 'bridge' | 'host'
  user: string
  securityOpts: string[]
  capDrop: string[]
  capAdd: string[]
}

export interface ExecutionContext {
  code: string
  language: 'javascript' | 'python'
  packages: string[]
  envVars?: Record<string, any>
  workflowContext?: Record<string, any>
}

export interface ExecutionResult {
  success: boolean
  result: any
  stdout: string
  stderr: string
  executionTime: number
  memoryUsage: number
  debugInfo?: any
  containerLogs?: string[]
  securityViolations?: string[]
}

/**
 * Container instance management
 */
interface ContainerInstance {
  id: string
  image: string
  status: 'creating' | 'ready' | 'running' | 'cleanup' | 'error'
  createdAt: Date
  lastUsed: Date
  execCount: number
}

/**
 * Docker Manager class for secure code execution
 */
export class DockerManager {
  private containerPool: Map<string, ContainerInstance> = new Map()
  private readonly maxPoolSize = 10
  private readonly containerTimeout = 300000 // 5 minutes before cleanup
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    this.startCleanupService()
  }

  /**
   * Execute code in a secure Docker container
   */
  async executeCode(config: ContainerConfig & ExecutionContext): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    logger.info(`[${executionId}] Starting Docker code execution`, {
      language: config.language,
      image: config.image,
      timeout: config.timeout,
      memoryLimit: Math.round(config.memory / 1024 / 1024) + 'MB',
    })

    try {
      // Validate Docker is available
      await this.validateDockerAvailable()

      // Get or create container
      const container = await this.getOrCreateContainer(config, executionId)

      // Execute code in container
      const result = await this.executeInContainer(container, config, executionId)

      // Update execution metrics
      result.executionTime = Date.now() - startTime

      logger.info(`[${executionId}] Docker execution completed successfully`, {
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
        success: result.success,
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error(`[${executionId}] Docker execution failed`, {
        error: error.message,
        executionTime,
      })

      return {
        success: false,
        result: null,
        stdout: '',
        stderr: error.message,
        executionTime,
        memoryUsage: 0,
        securityViolations: ['container_execution_failed'],
      }
    }
  }

  /**
   * Validate Docker is available and accessible
   */
  private async validateDockerAvailable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dockerCheck = spawn('docker', ['version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      dockerCheck.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error('Docker is not available or not accessible'))
        }
      })

      dockerCheck.on('error', (error) => {
        reject(new Error(`Docker validation failed: ${error.message}`))
      })
    })
  }

  /**
   * Get existing container or create new one
   */
  private async getOrCreateContainer(
    config: ContainerConfig,
    executionId: string
  ): Promise<ContainerInstance> {
    const imageKey = `${config.language}_${config.image}`
    
    // Try to get available container from pool
    const availableContainer = Array.from(this.containerPool.values()).find(
      (container) =>
        container.image === imageKey &&
        container.status === 'ready' &&
        container.execCount < 50 // Limit reuse to prevent resource leaks
    )

    if (availableContainer) {
      availableContainer.status = 'running'
      availableContainer.lastUsed = new Date()
      availableContainer.execCount++
      
      logger.debug(`[${executionId}] Reusing container ${availableContainer.id}`)
      return availableContainer
    }

    // Create new container if none available
    return await this.createContainer(config, executionId, imageKey)
  }

  /**
   * Create new Docker container with security configuration
   */
  private async createContainer(
    config: ContainerConfig,
    executionId: string,
    imageKey: string
  ): Promise<ContainerInstance> {
    const containerId = `sim_${config.language}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    logger.info(`[${executionId}] Creating new container ${containerId}`)

    const container: ContainerInstance = {
      id: containerId,
      image: imageKey,
      status: 'creating',
      createdAt: new Date(),
      lastUsed: new Date(),
      execCount: 0,
    }

    try {
      // Build Docker run command with security options
      const dockerArgs = [
        'run',
        '--detach',
        '--rm', // Auto-remove when stopped
        '--name', containerId,
        
        // Resource limits
        '--memory', `${Math.round(config.memory / 1024 / 1024)}m`,
        '--cpu-shares', config.cpuShares.toString(),
        '--pids-limit', '100',
        
        // Security hardening
        '--cap-drop', 'ALL',
        ...config.capAdd.map(cap => ['--cap-add', cap]).flat(),
        '--security-opt', 'no-new-privileges',
        '--user', config.user,
        
        // Network isolation
        '--network', config.networkMode,
        
        // File system protection
        ...(config.readOnly ? ['--read-only'] : []),
        '--tmpfs', '/tmp',
        '--tmpfs', '/var/tmp',
        
        // Container image
        config.image,
        
        // Keep container alive
        'sleep', 'infinity'
      ]

      await this.executeDockerCommand(dockerArgs, executionId)

      container.status = 'ready'
      this.containerPool.set(containerId, container)

      // Cleanup pool if it gets too large
      if (this.containerPool.size > this.maxPoolSize) {
        await this.cleanupOldestContainers()
      }

      logger.info(`[${executionId}] Container ${containerId} created successfully`)
      return container

    } catch (error) {
      container.status = 'error'
      logger.error(`[${executionId}] Container creation failed`, {
        containerId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Execute code inside the container
   */
  private async executeInContainer(
    container: ContainerInstance,
    config: ContainerConfig & ExecutionContext,
    executionId: string
  ): Promise<ExecutionResult> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sim-docker-'))
    
    try {
      // Prepare execution script based on language
      const scriptPath = await this.prepareExecutionScript(config, tempDir)

      // Copy script into container
      await this.copyFileToContainer(container.id, scriptPath, '/tmp/execute.js', executionId)

      // Execute script in container with timeout
      const result = await this.runScriptInContainer(
        container.id,
        config,
        executionId,
        `/tmp/execute.${config.language === 'javascript' ? 'js' : 'py'}`
      )

      container.status = 'ready' // Mark as available for reuse

      return result

    } finally {
      // Cleanup temporary files
      try {
        await fs.rm(tempDir, { recursive: true })
      } catch (error) {
        logger.warn(`[${executionId}] Failed to cleanup temp directory: ${error}`)
      }
    }
  }

  /**
   * Prepare execution script for the specified language
   */
  private async prepareExecutionScript(
    config: ContainerConfig & ExecutionContext,
    tempDir: string
  ): Promise<string> {
    const scriptExtension = config.language === 'javascript' ? 'js' : 'py'
    const scriptPath = path.join(tempDir, `execute.${scriptExtension}`)

    if (config.language === 'javascript') {
      // JavaScript execution script
      const jsScript = `
const vm = require('vm');
const fs = require('fs');

// Set up environment variables
${Object.entries(config.envVars || {})
  .map(([key, value]) => `process.env['${key}'] = ${JSON.stringify(String(value))};`)
  .join('\n')}

// Workflow context
const workflowContext = ${JSON.stringify(config.workflowContext || {}, null, 2)};

// User code
const userCode = ${JSON.stringify(config.code)};

// Create secure execution context
const context = vm.createContext({
  console: {
    log: (...args) => console.log('[USER]', ...args),
    error: (...args) => console.error('[USER]', ...args),
    warn: (...args) => console.warn('[USER]', ...args),
    info: (...args) => console.info('[USER]', ...args),
  },
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  Promise,
  JSON,
  Math,
  Date,
  Buffer,
  ...workflowContext,
});

// Execute user code
try {
  const script = new vm.Script(userCode);
  const result = script.runInContext(context, {
    timeout: 30000,
    displayErrors: true,
  });
  
  console.log(JSON.stringify({ success: true, result }));
} catch (error) {
  console.error(JSON.stringify({ 
    success: false, 
    error: error.message,
    stack: error.stack 
  }));
  process.exit(1);
}
      `
      
      await fs.writeFile(scriptPath, jsScript)
    } else {
      // Python execution script
      const pyScript = `
import sys
import json
import os
import traceback

# Set up environment variables
${Object.entries(config.envVars || {})
  .map(([key, value]) => `os.environ['${key}'] = ${JSON.stringify(String(value))}`)
  .join('\n')}

# Workflow context
workflow_data = ${JSON.stringify(config.workflowContext || {}, null, 2)}

try:
    # Execute user code
    result = None
    exec('''${config.code.replace(/'/g, "\\'")}''', globals())
    
    # Output result
    print(json.dumps({"success": True, "result": result}, default=str))
    
except Exception as e:
    error_info = {
        "success": False,
        "error": str(e),
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc()
    }
    print(json.dumps(error_info))
    sys.exit(1)
      `
      
      await fs.writeFile(scriptPath, pyScript)
    }

    return scriptPath
  }

  /**
   * Copy file into container
   */
  private async copyFileToContainer(
    containerId: string,
    sourcePath: string,
    destPath: string,
    executionId: string
  ): Promise<void> {
    const dockerArgs = ['cp', sourcePath, `${containerId}:${destPath}`]
    await this.executeDockerCommand(dockerArgs, executionId)
  }

  /**
   * Execute script inside container
   */
  private async runScriptInContainer(
    containerId: string,
    config: ContainerConfig & ExecutionContext,
    executionId: string,
    scriptPath: string
  ): Promise<ExecutionResult> {
    const interpreter = config.language === 'javascript' ? 'node' : 'python3'
    const dockerArgs = [
      'exec',
      '--user', config.user,
      containerId,
      interpreter,
      scriptPath
    ]

    let stdout = ''
    let stderr = ''
    let memoryUsage = 0

    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: config.timeout,
      })

      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      dockerProcess.on('close', (code) => {
        try {
          // Try to parse result from stdout
          const lines = stdout.trim().split('\n')
          const lastLine = lines[lines.length - 1]
          
          let result: any = null
          let success = code === 0

          try {
            const parsed = JSON.parse(lastLine)
            success = parsed.success
            result = parsed.result || null
            if (!success && parsed.error) {
              stderr = parsed.error + (parsed.traceback ? '\n' + parsed.traceback : '')
            }
          } catch {
            // If parsing fails, use raw output
            result = success ? stdout : null
          }

          resolve({
            success,
            result,
            stdout: lines.slice(0, -1).join('\n'),
            stderr,
            executionTime: 0, // Set by caller
            memoryUsage,
            debugInfo: {
              containerId,
              exitCode: code,
            },
          })

        } catch (error) {
          reject(error)
        }
      })

      dockerProcess.on('error', (error) => {
        reject(new Error(`Docker execution error: ${error.message}`))
      })
    })
  }

  /**
   * Execute Docker command with error handling
   */
  private async executeDockerCommand(args: string[], executionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const dockerProcess = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      dockerProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          reject(new Error(`Docker command failed with code ${code}: ${stderr}`))
        }
      })

      dockerProcess.on('error', (error) => {
        reject(new Error(`Docker command error: ${error.message}`))
      })
    })
  }

  /**
   * Start cleanup service for container lifecycle management
   */
  private startCleanupService(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredContainers()
    }, 60000) // Run every minute
  }

  /**
   * Cleanup expired or unused containers
   */
  private async cleanupExpiredContainers(): Promise<void> {
    const now = new Date()
    const containersToCleanup: string[] = []

    for (const [containerId, container] of this.containerPool.entries()) {
      const age = now.getTime() - container.lastUsed.getTime()
      
      if (
        age > this.containerTimeout ||
        container.status === 'error' ||
        container.execCount > 50
      ) {
        containersToCleanup.push(containerId)
      }
    }

    for (const containerId of containersToCleanup) {
      await this.cleanupContainer(containerId)
    }
  }

  /**
   * Cleanup oldest containers when pool is full
   */
  private async cleanupOldestContainers(): Promise<void> {
    const containers = Array.from(this.containerPool.values())
      .filter(c => c.status === 'ready')
      .sort((a, b) => a.lastUsed.getTime() - b.lastUsed.getTime())

    const toCleanup = containers.slice(0, Math.max(1, containers.length - this.maxPoolSize + 2))
    
    for (const container of toCleanup) {
      await this.cleanupContainer(container.id)
    }
  }

  /**
   * Cleanup individual container
   */
  private async cleanupContainer(containerId: string): Promise<void> {
    try {
      const container = this.containerPool.get(containerId)
      if (!container) return

      logger.debug(`Cleaning up container ${containerId}`)

      // Stop container
      await this.executeDockerCommand(['stop', containerId], 'cleanup')
      
      // Remove from pool
      this.containerPool.delete(containerId)

      logger.debug(`Container ${containerId} cleaned up successfully`)

    } catch (error) {
      logger.warn(`Failed to cleanup container ${containerId}: ${error.message}`)
      // Remove from pool anyway
      this.containerPool.delete(containerId)
    }
  }

  /**
   * Graceful shutdown - cleanup all containers
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Docker Manager...')

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Cleanup all containers
    const containerIds = Array.from(this.containerPool.keys())
    await Promise.all(containerIds.map(id => this.cleanupContainer(id)))

    logger.info('Docker Manager shutdown complete')
  }

  /**
   * Get container pool status for monitoring
   */
  getStatus(): {
    totalContainers: number
    activeContainers: number
    readyContainers: number
    containersByImage: Record<string, number>
  } {
    const containers = Array.from(this.containerPool.values())
    
    return {
      totalContainers: containers.length,
      activeContainers: containers.filter(c => c.status === 'running').length,
      readyContainers: containers.filter(c => c.status === 'ready').length,
      containersByImage: containers.reduce((acc, container) => {
        acc[container.image] = (acc[container.image] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}