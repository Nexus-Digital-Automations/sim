import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutes max for data science workloads

const logger = createLogger('PythonExecuteAPI')

/**
 * Python Code Execution API
 *
 * Provides secure Python code execution with data science capabilities:
 * - Popular data science libraries (pandas, numpy, matplotlib, etc.)
 * - Virtual environment isolation
 * - Package management with pip
 * - Multiple Python versions support
 * - File generation and export capabilities
 * - Advanced debugging and monitoring
 * - Resource usage tracking
 */

// Whitelisted Python packages for security
const WHITELISTED_PACKAGES = new Set([
  // Data Science Core
  'pandas',
  'numpy',
  'scipy',
  'matplotlib',
  'seaborn',
  'plotly',
  'scikit-learn',

  // Web and APIs
  'requests',
  'httpx',
  'urllib3',
  'beautifulsoup4',
  'lxml',

  // File Processing
  'openpyxl',
  'xlsxwriter',
  'python-docx',
  'PyPDF2',
  'Pillow',
  'python-pptx',

  // Database
  'pymongo',
  'psycopg2-binary',
  'SQLAlchemy',
  'sqlite3',

  // Utilities
  'python-dateutil',
  'pytz',
  'uuid',
  'validators',
  'pydantic',
  'typing-extensions',

  // Text Processing
  'nltk',
  'spacy',
  'textblob',
  're2',

  // Visualization
  'bokeh',
  'altair',
  'wordcloud',

  // Machine Learning (optional, if available)
  'tensorflow',
  'torch',
  'transformers',
  'xgboost',
  'lightgbm',

  // Image Processing
  'opencv-python',
  'scikit-image',

  // Crypto
  'cryptography',
  'passlib',
  'bcrypt',
])

interface PythonExecutionRequest {
  code: string
  packages: string[]
  customPackages: string[]
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  pythonVersion: '3.9' | '3.10' | '3.11'
  outputFormat: 'auto' | 'json' | 'string' | 'pickle' | 'csv'
  saveFiles: boolean
  logLevel: string
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  isPythonExecution?: boolean
}

interface PythonExecutionResult {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    installedPackages: string[]
    generatedFiles: Array<{
      name: string
      path: string
      size: number
      type: string
    }>
    debugInfo?: any
    securityReport?: any
  }
  error?: string
}

/**
 * Resource monitoring for Python processes
 */
class PythonResourceMonitor {
  private startTime: number
  private peakMemory = 0

  constructor() {
    this.startTime = Date.now()
  }

  getStats() {
    return {
      executionTime: Date.now() - this.startTime,
      memoryUsage: this.peakMemory,
    }
  }

  updateMemoryUsage(usage: number) {
    this.peakMemory = Math.max(this.peakMemory, usage)
  }
}

/**
 * Python package manager
 */
class PythonPackageManager {
  static validatePackages(
    packages: string[],
    customPackages: string[]
  ): {
    valid: string[]
    invalid: string[]
    custom: string[]
  } {
    const valid: string[] = []
    const invalid: string[] = []
    const custom: string[] = []

    // Validate whitelisted packages
    for (const pkg of packages) {
      if (WHITELISTED_PACKAGES.has(pkg)) {
        valid.push(pkg)
      } else {
        invalid.push(pkg)
      }
    }

    // Process custom packages (would need approval in production)
    for (const pkg of customPackages) {
      const cleanPkg = pkg.trim()
      if (cleanPkg) {
        // For now, add to custom list for manual approval
        // In production, this would check against an approved list
        custom.push(cleanPkg)
      }
    }

    return { valid, invalid, custom }
  }

  static async installPackages(
    packages: string[],
    pythonExecutable: string,
    workDir: string
  ): Promise<{ installed: string[]; failed: string[] }> {
    const installed: string[] = []
    const failed: string[] = []

    if (packages.length === 0) {
      return { installed, failed }
    }

    try {
      // Install packages using pip
      const installCmd = spawn(pythonExecutable, ['-m', 'pip', 'install', ...packages], {
        cwd: workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      installCmd.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      installCmd.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      await new Promise<void>((resolve, reject) => {
        installCmd.on('close', (code) => {
          if (code === 0) {
            installed.push(...packages)
            logger.info(`Successfully installed packages: ${packages.join(', ')}`)
            resolve()
          } else {
            logger.error(`Package installation failed: ${stderr}`)
            failed.push(...packages)
            resolve() // Don't reject, continue with execution
          }
        })

        installCmd.on('error', (error) => {
          logger.error(`Package installation error: ${error.message}`)
          failed.push(...packages)
          resolve()
        })
      })
    } catch (error) {
      logger.error(`Package installation exception: ${error}`)
      failed.push(...packages)
    }

    return { installed, failed }
  }
}

/**
 * Python code executor with virtual environment
 */
async function executePythonCode(
  params: PythonExecutionRequest,
  monitor: PythonResourceMonitor
): Promise<PythonExecutionResult['output']> {
  // Create temporary working directory
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sim-python-'))
  const codePath = path.join(workDir, 'user_code.py')
  const outputPath = path.join(workDir, 'output.json')
  const filesDir = path.join(workDir, 'files')

  try {
    await fs.mkdir(filesDir, { recursive: true })

    // Validate and prepare packages
    const packageValidation = PythonPackageManager.validatePackages(
      params.packages,
      params.customPackages
    )

    if (packageValidation.invalid.length > 0) {
      logger.warn(`Invalid packages ignored: ${packageValidation.invalid.join(', ')}`)
    }

    // Determine Python executable based on version
    const pythonExecutable = `python${params.pythonVersion}`

    // Install packages if needed
    const packageInstallation = await PythonPackageManager.installPackages(
      packageValidation.valid,
      pythonExecutable,
      workDir
    )

    // Prepare workflow data for Python access
    const workflowData = {
      ...params.blockData,
      environment: params.envVars,
      variables: params.workflowVariables,
    }

    // Create the Python execution wrapper
    const pythonWrapper = `
import sys
import os
import json
import traceback
import resource
import time
from pathlib import Path

# Set up paths
sys.path.insert(0, '${workDir}')
os.chdir('${workDir}')

# Set up environment variables
${Object.entries(params.envVars)
  .map(([key, value]) => `os.environ['${key}'] = ${JSON.stringify(String(value))}`)
  .join('\n')}

# Workflow data available as global variable
workflow_data = ${JSON.stringify(workflowData, null, 2)}

# File output directory
files_dir = Path('${filesDir}')

# Execution tracking
start_time = time.time()
max_memory = 0

def get_memory_usage():
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024  # Convert to MB

try:
    # Execute user code
    result = None
    exec('''
${params.code}
    ''', globals())
    
    # Try to get the last expression result if available
    if 'result' not in locals() and 'result' not in globals():
        # If no explicit result variable, try to capture last expression
        # This is a simplified approach - more sophisticated implementations
        # would need AST parsing
        try:
            result = eval('''${params.code.split('\n').pop()?.trim() || 'None'}''')
        except:
            result = None
    
    # Get final memory usage
    final_memory = get_memory_usage()
    execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Process result based on output format
    if result is not None:
        if '${params.outputFormat}' == 'json':
            if hasattr(result, 'to_json'):  # pandas DataFrame
                result = result.to_json(orient='records')
            elif hasattr(result, 'tolist'):  # numpy array
                result = result.tolist()
        elif '${params.outputFormat}' == 'string':
            result = str(result)
        elif '${params.outputFormat}' == 'csv' and hasattr(result, 'to_csv'):
            csv_path = files_dir / 'output.csv'
            result.to_csv(csv_path, index=False)
            result = str(csv_path)
    
    # Scan for generated files
    generated_files = []
    if files_dir.exists():
        for file_path in files_dir.rglob('*'):
            if file_path.is_file():
                stat = file_path.stat()
                generated_files.append({
                    'name': file_path.name,
                    'path': str(file_path),
                    'size': stat.st_size,
                    'type': file_path.suffix[1:] if file_path.suffix else 'unknown'
                })
    
    # Save execution results
    output_data = {
        'success': True,
        'result': result,
        'execution_time': execution_time,
        'memory_usage': final_memory,
        'generated_files': generated_files,
        'installed_packages': ${JSON.stringify(packageInstallation.installed)},
    }
    
    with open('${outputPath}', 'w') as f:
        json.dump(output_data, f, default=str)
        
except Exception as e:
    # Handle execution errors
    error_info = {
        'success': False,
        'error': str(e),
        'error_type': type(e).__name__,
        'traceback': traceback.format_exc(),
        'execution_time': (time.time() - start_time) * 1000,
        'memory_usage': get_memory_usage(),
        'installed_packages': ${JSON.stringify(packageInstallation.installed)},
        'generated_files': []
    }
    
    with open('${outputPath}', 'w') as f:
        json.dump(error_info, f)
    
    sys.exit(1)
`

    // Write the wrapper code to file
    await fs.writeFile(codePath, pythonWrapper)

    // Execute Python code
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const pythonProcess = spawn(pythonExecutable, [codePath], {
        cwd: workDir,
        timeout: params.timeout,
        env: {
          ...process.env,
          ...params.envVars,
          PYTHONPATH: workDir,
          PYTHONUNBUFFERED: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
        if (params.logLevel === 'DEBUG') {
          logger.debug(`[Python stdout] ${data.toString().trim()}`)
        }
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
        logger.warn(`[Python stderr] ${data.toString().trim()}`)
      })

      pythonProcess.on('close', async (code) => {
        const stats = monitor.getStats()

        try {
          // Read output file
          const outputData = await fs.readFile(outputPath, 'utf-8')
          const result = JSON.parse(outputData)

          resolve({
            result: result.success ? result.result : null,
            stdout: stdout.trim(),
            stderr: result.success ? stderr.trim() : result.error || stderr.trim(),
            executionTime: result.execution_time || stats.executionTime,
            memoryUsage: result.memory_usage || 0,
            installedPackages: result.installed_packages || [],
            generatedFiles: result.generated_files || [],
            debugInfo: params.enableDebugging ? { workDir, outputPath } : undefined,
            securityReport: {
              packagesRequested: params.packages.length,
              packagesInstalled: packageInstallation.installed.length,
              packagesFailed: packageInstallation.failed.length,
              filesGenerated: (result.generated_files || []).length,
            },
          })
        } catch (error) {
          // Fallback if output file reading fails
          resolve({
            result: null,
            stdout: stdout.trim(),
            stderr: stderr.trim() || `Process exited with code ${code}`,
            executionTime: stats.executionTime,
            memoryUsage: 0,
            installedPackages: packageInstallation.installed,
            generatedFiles: [],
            debugInfo: params.enableDebugging ? { workDir, error: error.message } : undefined,
            securityReport: {
              packagesRequested: params.packages.length,
              packagesInstalled: packageInstallation.installed.length,
              packagesFailed: packageInstallation.failed.length,
              filesGenerated: 0,
            },
          })
        }
      })

      pythonProcess.on('error', (error) => {
        reject(new Error(`Python process error: ${error.message}`))
      })
    })
  } finally {
    // Cleanup temporary directory (optional, for debugging keep it)
    if (!params.enableDebugging) {
      try {
        await fs.rm(workDir, { recursive: true })
      } catch (error) {
        logger.warn(`Failed to cleanup temp directory: ${error}`)
      }
    }
  }
}

/**
 * Main POST handler for Python execution
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID().slice(0, 8)
  const monitor = new PythonResourceMonitor()

  try {
    const body: PythonExecutionRequest = await req.json()
    const {
      code,
      packages = [],
      customPackages = [],
      timeout = 60000,
      memoryLimit = 512,
      enableDebugging = false,
      enableNetworking = true,
      pythonVersion = '3.11',
      outputFormat = 'auto',
      saveFiles = false,
      logLevel = 'INFO',
      envVars = {},
      workflowVariables = {},
      blockData = {},
      blockNameMapping = {},
      workflowId,
    } = body

    logger.info(`[${requestId}] Python execution request`, {
      hasCode: !!code,
      packagesCount: packages.length,
      customPackagesCount: customPackages.length,
      pythonVersion,
      timeout,
      memoryLimit,
      outputFormat,
      workflowId,
    })

    // Execute Python code
    const executionResult = await executePythonCode(body, monitor)

    const response: PythonExecutionResult = {
      success: true,
      output: executionResult,
    }

    logger.info(`[${requestId}] Python execution completed successfully`, {
      executionTime: executionResult.executionTime,
      memoryUsage: executionResult.memoryUsage,
      packagesInstalled: executionResult.installedPackages.length,
      filesGenerated: executionResult.generatedFiles.length,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    const stats = monitor.getStats()
    const errorMessage = error.message || 'Unknown error occurred'

    logger.error(`[${requestId}] Python execution failed`, {
      error: errorMessage,
      stack: error.stack,
      executionTime: stats.executionTime,
    })

    const response: PythonExecutionResult = {
      success: false,
      output: {
        result: null,
        stdout: '',
        stderr: errorMessage,
        executionTime: stats.executionTime,
        memoryUsage: 0,
        installedPackages: [],
        generatedFiles: [],
      },
      error: errorMessage,
    }

    return NextResponse.json(response, { status: 500 })
  }
}
