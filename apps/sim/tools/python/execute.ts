import type { ToolConfig } from '@/tools/types'

/**
 * Python Code Execution Input
 */
export interface PythonExecutionInput {
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
  logLevel: 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG'
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  _context?: any
}

/**
 * Python Code Execution Output
 */
export interface PythonExecutionOutput {
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
}

const DEFAULT_TIMEOUT = 60000 // 60 seconds
const DEFAULT_MEMORY_LIMIT = 512 // 512 MB

/**
 * Python Execute Tool
 *
 * Provides secure Python code execution with data science capabilities:
 * - Popular data science libraries (pandas, numpy, matplotlib, etc.)
 * - Virtual environment isolation
 * - Package management with pip
 * - Multiple Python versions support
 * - File generation and export capabilities
 * - Advanced debugging and monitoring
 * - Docker-based secure sandboxing
 */
export const pythonExecuteTool: ToolConfig<PythonExecutionInput, PythonExecutionOutput> = {
  id: 'python_execute',
  name: 'Python Code Execute',
  description:
    'Execute Python code in a secure, sandboxed environment with data science libraries, package management, and comprehensive monitoring.',
  version: '1.0.0',

  params: {
    code: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'The Python code to execute',
    },
    packages: {
      type: 'array',
      required: false,
      visibility: 'user-only',
      description: 'List of whitelisted Python packages to install via pip',
      default: [],
    },
    customPackages: {
      type: 'array',
      required: false,
      visibility: 'user-only',
      description: 'Custom packages with version constraints (requires approval)',
      default: [],
    },
    timeout: {
      type: 'number',
      required: false,
      visibility: 'user-only',
      description: 'Execution timeout in milliseconds',
      default: DEFAULT_TIMEOUT,
    },
    memoryLimit: {
      type: 'number',
      required: false,
      visibility: 'user-only',
      description: 'Memory limit in MB',
      default: DEFAULT_MEMORY_LIMIT,
    },
    enableDebugging: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Enable Python debugging features with pdb',
      default: false,
    },
    enableNetworking: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Allow network access for API requests and downloads',
      default: true,
    },
    pythonVersion: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Python interpreter version to use',
      default: '3.11',
    },
    outputFormat: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Output serialization format',
      default: 'auto',
    },
    saveFiles: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Save generated files (plots, CSVs, etc.) for download',
      default: false,
    },
    logLevel: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Python logging level',
      default: 'INFO',
    },
    envVars: {
      type: 'object',
      required: false,
      visibility: 'user-only',
      description: 'Environment variables to make available during execution',
      default: {},
    },
    blockData: {
      type: 'object',
      required: false,
      visibility: 'user-only',
      description: 'Block output data for variable resolution',
      default: {},
    },
    blockNameMapping: {
      type: 'object',
      required: false,
      visibility: 'user-only',
      description: 'Mapping of block names to block IDs',
      default: {},
    },
    workflowVariables: {
      type: 'object',
      required: false,
      visibility: 'user-only',
      description: 'Workflow variables for access in Python code',
      default: {},
    },
  },

  request: {
    url: '/api/python/execute',
    method: 'POST',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    body: (params: PythonExecutionInput) => {
      const codeContent = Array.isArray(params.code)
        ? params.code.map((c: { content: string }) => c.content).join('\n')
        : params.code

      return {
        code: codeContent,
        packages: params.packages || [],
        customPackages: params.customPackages || [],
        timeout: params.timeout || DEFAULT_TIMEOUT,
        memoryLimit: params.memoryLimit || DEFAULT_MEMORY_LIMIT,
        enableDebugging: params.enableDebugging || false,
        enableNetworking: params.enableNetworking || true,
        pythonVersion: params.pythonVersion || '3.11',
        outputFormat: params.outputFormat || 'auto',
        saveFiles: params.saveFiles || false,
        logLevel: params.logLevel || 'INFO',
        envVars: params.envVars || {},
        workflowVariables: params.workflowVariables || {},
        blockData: params.blockData || {},
        blockNameMapping: params.blockNameMapping || {},
        workflowId: params._context?.workflowId,
        isPythonExecution: true,
      }
    },
  },

  transformResponse: async (response: Response): Promise<PythonExecutionOutput> => {
    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        output: {
          result: null,
          stdout: result.output?.stdout || '',
          stderr: result.error || 'Unknown error occurred',
          executionTime: result.output?.executionTime || 0,
          memoryUsage: result.output?.memoryUsage || 0,
          installedPackages: result.output?.installedPackages || [],
          generatedFiles: result.output?.generatedFiles || [],
          debugInfo: result.debug || null,
          securityReport: result.securityReport || null,
        },
      }
    }

    return {
      success: true,
      output: {
        result: result.output.result,
        stdout: result.output.stdout || '',
        stderr: result.output.stderr || '',
        executionTime: result.output.executionTime || 0,
        memoryUsage: result.output.memoryUsage || 0,
        installedPackages: result.output.installedPackages || [],
        generatedFiles: result.output.generatedFiles || [],
        debugInfo: result.output.debugInfo || null,
        securityReport: result.output.securityReport || null,
      },
    }
  },

  outputs: {
    result: {
      type: 'string',
      description: 'The result of the Python code execution',
    },
    stdout: {
      type: 'string',
      description: 'Standard output from Python including print statements',
    },
    stderr: {
      type: 'string',
      description: 'Error output and warnings from Python execution',
    },
    executionTime: {
      type: 'number',
      description: 'Execution time in milliseconds',
    },
    memoryUsage: {
      type: 'number',
      description: 'Peak memory usage in MB',
    },
    installedPackages: {
      type: 'array',
      description: 'List of successfully installed Python packages',
    },
    generatedFiles: {
      type: 'array',
      description: 'Files generated during execution (plots, exports, etc.)',
    },
    debugInfo: {
      type: 'object',
      description: 'Debugging information and variable states',
    },
    securityReport: {
      type: 'object',
      description: 'Security analysis and resource usage report',
    },
  },
}
