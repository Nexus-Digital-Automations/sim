/**
 * Docker Container Manager for Secure Code Execution
 *
 * Provides Docker-based sandboxing for JavaScript and Python code execution
 * with comprehensive security measures and resource management.
 */

import { spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('DockerManager')

export interface DockerConfig {
  image: string
  memory: string // e.g., '256m'
  cpus: string // e.g., '0.5'
  timeout: number // milliseconds
  network: 'none' | 'host' | 'bridge'
  readOnly: boolean
  removeAfterExecution: boolean
  workdir: string
  user: string
  environmentVariables: Record<string, string>
  volumes?: Array<{
    host: string
    container: string
    readonly: boolean
  }>
  ports?: Array<{
    host: number
    container: number
    protocol: 'tcp' | 'udp'
  }>
}

export interface ExecutionResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  containerId?: string
  resourceUsage?: {
    memoryUsage: number
    cpuUsage: number
  }
}

export class DockerManager {
  private static instance: DockerManager
  private containerPool: Map<string, string> = new Map()
  private readonly maxPoolSize = 10

  private constructor() {}

  static getInstance(): DockerManager {
    if (!DockerManager.instance) {
      DockerManager.instance = new DockerManager()
    }
    return DockerManager.instance
  }

  /**
   * Check if Docker is available and running
   */
  async checkDockerAvailability(): Promise<boolean> {
    try {
      const result = await this.executeCommand('docker', ['--version'])
      return result.success
    } catch (error) {
      logger.error('Docker is not available:', error)
      return false
    }
  }

  /**
   * Build custom Docker images for code execution
   */
  async buildExecutionImages(): Promise<void> {
    await Promise.all([this.buildJavaScriptImage(), this.buildPythonImage()])
  }

  /**
   * Build JavaScript execution Docker image
   */
  private async buildJavaScriptImage(): Promise<void> {
    const dockerfile = `
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1000 simuser && \\
    adduser -u 1000 -G simuser -s /bin/sh -D simuser

# Install security updates
RUN apk update && apk upgrade

# Create working directory
WORKDIR /app
RUN chown simuser:simuser /app

# Install common packages (whitelisted only)
RUN npm install -g lodash moment axios uuid crypto-js validator cheerio csv-parser xml2js bcrypt jsonwebtoken sharp

# Create execution script
COPY --chown=simuser:simuser execute.js /app/
RUN chmod +x /app/execute.js

# Switch to non-root user
USER simuser

# Set security options
ENV NODE_OPTIONS="--max-old-space-size=256 --no-deprecation"
ENV NODE_ENV=sandbox

ENTRYPOINT ["node", "/app/execute.js"]
`

    const executeScript = `
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read code from mounted file
const codePath = process.env.CODE_FILE || '/tmp/user-code.js';
const outputPath = process.env.OUTPUT_FILE || '/tmp/output.json';

async function executeCode() {
  try {
    const code = await fs.promises.readFile(codePath, 'utf8');
    const startTime = Date.now();
    
    // Create secure context
    const context = vm.createContext({
      console,
      require: (name) => {
        const allowedModules = ['lodash', 'moment', 'axios', 'uuid', 'crypto-js', 'validator'];
        if (allowedModules.includes(name)) {
          return require(name);
        }
        throw new Error(\`Module '\${name}' is not allowed\`);
      },
      process: {
        env: process.env,
        version: process.version,
        platform: process.platform
      },
      Buffer,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval
    });

    // Execute code with timeout
    const script = new vm.Script(\`(async () => { \${code} })()\`);
    const result = await script.runInContext(context, {
      timeout: parseInt(process.env.EXECUTION_TIMEOUT) || 30000,
      displayErrors: true
    });

    const executionTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    // Write output
    const output = {
      success: true,
      result,
      executionTime,
      memoryUsage
    };

    await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2));
    process.exit(0);
  } catch (error) {
    const output = {
      success: false,
      error: error.message,
      stack: error.stack,
      executionTime: Date.now() - startTime || 0,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };

    await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2));
    process.exit(1);
  }
}

executeCode();
`

    await this.buildImage('sim-javascript', dockerfile, { 'execute.js': executeScript })
    logger.info('JavaScript Docker image built successfully')
  }

  /**
   * Build Python execution Docker image
   */
  private async buildPythonImage(): Promise<void> {
    const dockerfile = `
FROM python:3.11-alpine

# Create non-root user
RUN addgroup -g 1000 simuser && \\
    adduser -u 1000 -G simuser -s /bin/sh -D simuser

# Install system dependencies
RUN apk update && apk upgrade && \\
    apk add --no-cache gcc musl-dev libffi-dev openssl-dev

# Install common Python packages
RUN pip install --no-cache-dir pandas numpy matplotlib seaborn scikit-learn requests beautifulsoup4 openpyxl python-docx Pillow

# Create working directory
WORKDIR /app
RUN chown simuser:simuser /app

# Create execution script
COPY --chown=simuser:simuser execute.py /app/
RUN chmod +x /app/execute.py

# Switch to non-root user
USER simuser

# Set Python environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

ENTRYPOINT ["python", "/app/execute.py"]
`

    const executeScript = `
import os
import sys
import json
import traceback
import time
import resource
from pathlib import Path

def execute_code():
    code_file = os.environ.get('CODE_FILE', '/tmp/user-code.py')
    output_file = os.environ.get('OUTPUT_FILE', '/tmp/output.json')
    timeout = int(os.environ.get('EXECUTION_TIMEOUT', 60))
    
    try:
        # Set resource limits
        resource.setrlimit(resource.RLIMIT_CPU, (timeout, timeout))
        resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))  # 256MB
        
        start_time = time.time()
        
        # Read and execute code
        with open(code_file, 'r') as f:
            code = f.read()
        
        # Create execution globals
        exec_globals = {
            '__name__': '__main__',
            '__builtins__': __builtins__,
            'print': print,
            'len': len,
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'sorted': sorted,
            'sum': sum,
            'min': min,
            'max': max,
        }
        
        # Execute code
        exec(code, exec_globals)
        
        execution_time = (time.time() - start_time) * 1000  # ms
        memory_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024  # MB
        
        # Get result if available
        result = exec_globals.get('result', None)
        
        output = {
            'success': True,
            'result': result,
            'execution_time': execution_time,
            'memory_usage': memory_usage
        }
        
        with open(output_file, 'w') as f:
            json.dump(output, f, default=str, indent=2)
            
        sys.exit(0)
        
    except Exception as e:
        execution_time = (time.time() - start_time) * 1000 if 'start_time' in locals() else 0
        memory_usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
        
        output = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'execution_time': execution_time,
            'memory_usage': memory_usage
        }
        
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)
            
        sys.exit(1)

if __name__ == '__main__':
    execute_code()
`

    await this.buildImage('sim-python', dockerfile, { 'execute.py': executeScript })
    logger.info('Python Docker image built successfully')
  }

  /**
   * Execute JavaScript code in Docker container
   */
  async executeJavaScript(
    code: string,
    config: Partial<DockerConfig> = {}
  ): Promise<ExecutionResult> {
    const dockerConfig: DockerConfig = {
      image: 'sim-javascript',
      memory: config.memory || '256m',
      cpus: config.cpus || '0.5',
      timeout: config.timeout || 30000,
      network: config.network || 'none',
      readOnly: config.readOnly !== undefined ? config.readOnly : true,
      removeAfterExecution:
        config.removeAfterExecution !== undefined ? config.removeAfterExecution : true,
      workdir: config.workdir || '/app',
      user: config.user || '1000:1000',
      environmentVariables: {
        EXECUTION_TIMEOUT: String(config.timeout || 30000),
        ...config.environmentVariables,
      },
    }

    return this.executeInContainer(code, dockerConfig, 'javascript')
  }

  /**
   * Execute Python code in Docker container
   */
  async executePython(code: string, config: Partial<DockerConfig> = {}): Promise<ExecutionResult> {
    const dockerConfig: DockerConfig = {
      image: 'sim-python',
      memory: config.memory || '512m',
      cpus: config.cpus || '0.5',
      timeout: config.timeout || 60000,
      network: config.network || 'none',
      readOnly: config.readOnly !== undefined ? config.readOnly : true,
      removeAfterExecution:
        config.removeAfterExecution !== undefined ? config.removeAfterExecution : true,
      workdir: config.workdir || '/app',
      user: config.user || '1000:1000',
      environmentVariables: {
        EXECUTION_TIMEOUT: String(config.timeout || 60000),
        ...config.environmentVariables,
      },
    }

    return this.executeInContainer(code, dockerConfig, 'python')
  }

  /**
   * Execute code in Docker container with security measures
   */
  private async executeInContainer(
    code: string,
    config: DockerConfig,
    language: 'javascript' | 'python'
  ): Promise<ExecutionResult> {
    const executionId = crypto.randomBytes(8).toString('hex')
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `sim-docker-${executionId}-`))

    try {
      // Prepare files
      const codeFile = path.join(
        tempDir,
        language === 'javascript' ? 'user-code.js' : 'user-code.py'
      )
      const outputFile = path.join(tempDir, 'output.json')

      await fs.writeFile(codeFile, code)

      // Build Docker command
      const dockerArgs = [
        'run',
        '--rm', // Remove container after execution
        '--memory',
        config.memory,
        '--cpus',
        config.cpus,
        '--network',
        config.network,
        '--user',
        config.user,
        '--workdir',
        config.workdir,
        '--security-opt',
        'no-new-privileges',
        '--cap-drop',
        'ALL',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=100m',
      ]

      // Add read-only flag if specified
      if (config.readOnly) {
        dockerArgs.push('--read-only')
      }

      // Add volumes
      dockerArgs.push(
        '-v',
        `${codeFile}:/tmp/user-code.${language === 'javascript' ? 'js' : 'py'}:ro`,
        '-v',
        `${outputFile}:/tmp/output.json:rw`
      )

      // Add environment variables
      for (const [key, value] of Object.entries(config.environmentVariables)) {
        dockerArgs.push('-e', `${key}=${value}`)
      }

      // Set environment for execution
      dockerArgs.push(
        '-e',
        `CODE_FILE=/tmp/user-code.${language === 'javascript' ? 'js' : 'py'}`,
        '-e',
        'OUTPUT_FILE=/tmp/output.json'
      )

      // Add image
      dockerArgs.push(config.image)

      const startTime = Date.now()
      const result = await this.executeCommand('docker', dockerArgs, config.timeout)
      const executionTime = Date.now() - startTime

      // Read output
      let output: any = {}
      try {
        const outputContent = await fs.readFile(outputFile, 'utf8')
        output = JSON.parse(outputContent)
      } catch (error) {
        logger.warn(`Failed to read output file: ${error}`)
        output = {
          success: false,
          error: 'Failed to read execution output',
        }
      }

      return {
        success: result.success && output.success,
        stdout: result.stdout || '',
        stderr: result.stderr || output.error || '',
        exitCode: result.exitCode || (output.success ? 0 : 1),
        executionTime: output.execution_time || executionTime,
        resourceUsage: {
          memoryUsage: output.memory_usage || 0,
          cpuUsage: 0, // Would need additional monitoring
        },
      }
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true })
      } catch (error) {
        logger.warn(`Failed to cleanup temp directory: ${error}`)
      }
    }
  }

  /**
   * Build Docker image from Dockerfile
   */
  private async buildImage(
    imageName: string,
    dockerfile: string,
    files: Record<string, string> = {}
  ): Promise<void> {
    const buildDir = await fs.mkdtemp(path.join(os.tmpdir(), `docker-build-${imageName}-`))

    try {
      // Write Dockerfile
      await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile)

      // Write additional files
      for (const [filename, content] of Object.entries(files)) {
        await fs.writeFile(path.join(buildDir, filename), content)
      }

      // Build image
      const result = await this.executeCommand(
        'docker',
        ['build', '-t', imageName, '--no-cache', buildDir],
        300000
      ) // 5 minutes timeout for build

      if (!result.success) {
        throw new Error(`Failed to build Docker image ${imageName}: ${result.stderr}`)
      }

      logger.info(`Successfully built Docker image: ${imageName}`)
    } finally {
      // Cleanup build directory
      try {
        await fs.rm(buildDir, { recursive: true })
      } catch (error) {
        logger.warn(`Failed to cleanup build directory: ${error}`)
      }
    }
  }

  /**
   * Execute shell command with timeout
   */
  private executeCommand(
    command: string,
    args: string[],
    timeout = 30000
  ): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      let stdout = ''
      let stderr = ''

      const child = spawn(command, args, {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        })
      })

      child.on('error', (error) => {
        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: error.message,
          exitCode: 1,
        })
      })
    })
  }

  /**
   * Cleanup Docker resources
   */
  async cleanup(): Promise<void> {
    try {
      // Remove unused containers
      await this.executeCommand('docker', ['container', 'prune', '-f'])

      // Remove unused images
      await this.executeCommand('docker', ['image', 'prune', '-f'])

      logger.info('Docker cleanup completed')
    } catch (error) {
      logger.warn(`Docker cleanup failed: ${error}`)
    }
  }

  /**
   * Get Docker system information
   */
  async getSystemInfo(): Promise<any> {
    try {
      const result = await this.executeCommand('docker', ['system', 'info', '--format', 'json'])
      if (result.success) {
        return JSON.parse(result.stdout)
      }
    } catch (error) {
      logger.error(`Failed to get Docker system info: ${error}`)
    }
    return null
  }
}
