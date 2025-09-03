import type { ToolConfig } from '@/tools/types'

/**
 * Enhanced JavaScript Code Execution Input
 */
export interface JavaScriptExecutionInput {
  code: string
  packages: string[]
  timeout: number
  memoryLimit: number
  enableDebugging: boolean
  enableNetworking: boolean
  sandboxMode: 'vm' | 'process' | 'docker'
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  envVars: Record<string, any>
  workflowVariables: Record<string, any>
  blockData: Record<string, any>
  blockNameMapping: Record<string, string>
  workflowId?: string
  _context?: any
}

/**
 * Enhanced JavaScript Code Execution Output
 */
export interface JavaScriptExecutionOutput {
  success: boolean
  output: {
    result: any
    stdout: string
    stderr: string
    executionTime: number
    memoryUsage: number
    debugInfo?: any
    securityReport?: any
  }
}

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_MEMORY_LIMIT = 256 // 256 MB

/**
 * Enhanced JavaScript Execute Tool
 *
 * Provides secure JavaScript code execution with advanced features:
 * - NPM package management with whitelisted packages
 * - Multiple sandboxing modes (VM, Process, Docker)
 * - Resource monitoring and limits
 * - Advanced debugging capabilities
 * - Security analysis and reporting
 * - Network access controls
 */
export const javaScriptExecuteTool: ToolConfig<
  JavaScriptExecutionInput,
  JavaScriptExecutionOutput
> = {
  id: 'javascript_execute',
  name: 'Enhanced JavaScript Execute',
  description:
    'Execute JavaScript code in a secure, sandboxed environment with NPM package support, advanced debugging, and comprehensive resource monitoring.',
  version: '2.0.0',

  params: {
    code: {
      type: 'string',
      required: true,
      visibility: 'user-or-llm',
      description: 'The JavaScript code to execute',
    },
    packages: {
      type: 'array',
      required: false,
      visibility: 'user-only',
      description: 'List of whitelisted NPM packages to make available',
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
      description: 'Enable advanced debugging features',
      default: false,
    },
    enableNetworking: {
      type: 'boolean',
      required: false,
      visibility: 'user-only',
      description: 'Allow network access for HTTP requests',
      default: true,
    },
    sandboxMode: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Sandboxing mode: vm, process, or docker',
      default: 'vm',
    },
    logLevel: {
      type: 'string',
      required: false,
      visibility: 'user-only',
      description: 'Logging verbosity level',
      default: 'info',
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
      description: 'Workflow variables for <variable.name> resolution',
      default: {},
    },
  },

  request: {
    url: '/api/javascript/execute',
    method: 'POST',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    body: (params: JavaScriptExecutionInput) => {
      const codeContent = Array.isArray(params.code)
        ? params.code.map((c: { content: string }) => c.content).join('\n')
        : params.code

      return {
        code: codeContent,
        packages: params.packages || [],
        timeout: params.timeout || DEFAULT_TIMEOUT,
        memoryLimit: params.memoryLimit || DEFAULT_MEMORY_LIMIT,
        enableDebugging: params.enableDebugging || false,
        enableNetworking: params.enableNetworking || true,
        sandboxMode: params.sandboxMode || 'vm',
        logLevel: params.logLevel || 'info',
        envVars: params.envVars || {},
        workflowVariables: params.workflowVariables || {},
        blockData: params.blockData || {},
        blockNameMapping: params.blockNameMapping || {},
        workflowId: params._context?.workflowId,
        isEnhancedJavaScript: true,
      }
    },
  },

  transformResponse: async (response: Response): Promise<JavaScriptExecutionOutput> => {
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
        debugInfo: result.output.debugInfo || null,
        securityReport: result.output.securityReport || null,
      },
    }
  },

  outputs: {
    result: {
      type: 'string',
      description: 'The result of the JavaScript code execution',
    },
    stdout: {
      type: 'string',
      description: 'Standard output from the code execution',
    },
    stderr: {
      type: 'string',
      description: 'Error output from the code execution',
    },
    executionTime: {
      type: 'number',
      description: 'Execution time in milliseconds',
    },
    memoryUsage: {
      type: 'number',
      description: 'Peak memory usage in MB',
    },
    debugInfo: {
      type: 'object',
      description: 'Debugging information and variable states',
    },
    securityReport: {
      type: 'object',
      description: 'Security analysis and policy compliance report',
    },
  },
}
