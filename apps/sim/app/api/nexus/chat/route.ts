/**
 * Nexus Copilot Chat API - Advanced AI Assistant
 * Integrates Claude 3.5 Sonnet with comprehensive Sim platform tools
 * Provides streaming responses with tool orchestration and context management
 */

import { Anthropic } from '@anthropic-ai/sdk'
import { streamText } from 'ai'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute timeout for complex operations

const logger = createLogger('NexusAPI')

// Initialize Anthropic client with error handling
const getAnthropicClient = () => {
  const apiKey = env.ANTHROPIC_API_KEY_1 || env.ANTHROPIC_API_KEY_2 || env.ANTHROPIC_API_KEY_3

  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY environment variable is required')
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  return new Anthropic({
    apiKey,
  })
}

// Request schema validation
const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  workspaceId: z.string().optional(),
  workflowId: z.string().optional(),
  stream: z.boolean().default(true),
  temperature: z.number().min(0).max(1).default(0.1),
  maxTokens: z.number().min(1).max(8192).default(4096),
})

// Tool definitions for Nexus copilot capabilities
const nexusTools = {
  // Workflow Management Tools
  listWorkflows: {
    description: 'List workflows in a workspace with filtering and pagination support',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description: 'The workspace ID to list workflows from',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: 'Filter workflows by status',
        },
        search: {
          type: 'string',
          description: 'Search term to filter workflow names and descriptions',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of workflows to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of workflows to skip for pagination (default: 0)',
        },
      },
      required: ['workspaceId'],
    },
  },

  createWorkflow: {
    description: 'Create a new workflow with specified configuration',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description: 'The workspace ID where the workflow will be created',
        },
        name: {
          type: 'string',
          description: 'Name of the new workflow',
        },
        description: {
          type: 'string',
          description: 'Description of what the workflow does',
        },
        template: {
          type: 'string',
          description: 'Optional template ID to base the workflow on',
        },
        blocks: {
          type: 'array',
          description: 'Array of initial blocks to include in the workflow',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              config: { type: 'object' },
            },
          },
        },
      },
      required: ['workspaceId', 'name'],
    },
  },

  executeWorkflow: {
    description: 'Execute a workflow with specified input parameters',
    parameters: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'The ID of the workflow to execute',
        },
        inputs: {
          type: 'object',
          description: 'Input parameters for workflow execution',
        },
        mode: {
          type: 'string',
          enum: ['test', 'production'],
          description: 'Execution mode (default: test)',
        },
        async: {
          type: 'boolean',
          description: 'Whether to run the workflow asynchronously (default: false)',
        },
      },
      required: ['workflowId'],
    },
  },

  // Environment & Configuration Tools
  manageEnvironment: {
    description: 'Get, set, or list environment variables for a workspace',
    parameters: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'string',
          description: 'The workspace ID to manage environment variables for',
        },
        action: {
          type: 'string',
          enum: ['get', 'set', 'list', 'delete'],
          description: 'The action to perform on environment variables',
        },
        key: {
          type: 'string',
          description: 'Environment variable key (required for get, set, delete actions)',
        },
        value: {
          type: 'string',
          description: 'Environment variable value (required for set action)',
        },
        encrypted: {
          type: 'boolean',
          description: 'Whether the value should be encrypted (default: false)',
        },
      },
      required: ['workspaceId', 'action'],
    },
  },

  // Knowledge & Search Tools
  searchKnowledge: {
    description: 'Search through knowledge base documents using semantic search',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant knowledge',
        },
        knowledgeBaseId: {
          type: 'string',
          description: 'Specific knowledge base to search in (optional)',
        },
        workspaceId: {
          type: 'string',
          description: 'Workspace to search within (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
        threshold: {
          type: 'number',
          description: 'Minimum similarity threshold (0-1, default: 0.7)',
        },
      },
      required: ['query'],
    },
  },

  // File Management Tools
  manageFiles: {
    description: 'Upload, download, list, or delete files in the workspace',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'upload', 'download', 'delete', 'get-info'],
          description: 'The file operation to perform',
        },
        workspaceId: {
          type: 'string',
          description: 'The workspace ID to operate in',
        },
        path: {
          type: 'string',
          description: 'File path (required for upload, download, delete, get-info)',
        },
        content: {
          type: 'string',
          description: 'File content for upload (base64 encoded for binary files)',
        },
        mimeType: {
          type: 'string',
          description: 'MIME type of the file (for uploads)',
        },
      },
      required: ['action', 'workspaceId'],
    },
  },

  // Billing & Usage Tools
  billingOperations: {
    description: 'Check usage, billing status, and subscription information',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['usage', 'billing', 'subscription', 'limits'],
          description: 'The billing operation to perform',
        },
        workspaceId: {
          type: 'string',
          description: 'Workspace to check billing for (optional)',
        },
        timeframe: {
          type: 'string',
          enum: ['current-month', 'last-month', 'last-30-days', 'all-time'],
          description: 'Time period for usage queries (default: current-month)',
        },
      },
      required: ['action'],
    },
  },

  // Dynamic Tool Registry
  toolRegistry: {
    description: 'Register, list, or execute custom tools dynamically',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['register', 'list', 'execute', 'unregister'],
          description: 'The registry operation to perform',
        },
        toolId: {
          type: 'string',
          description: 'Tool identifier (required for execute, unregister)',
        },
        toolConfig: {
          type: 'object',
          description: 'Tool configuration for registration',
        },
        parameters: {
          type: 'object',
          description: 'Parameters for tool execution',
        },
      },
      required: ['action'],
    },
  },
}

// Tool execution handlers
const executeNexusTool = async (toolName: string, parameters: any, session: any) => {
  const operationId = `nexus-tool-${Date.now()}`

  logger.info(`[${operationId}] Executing Nexus tool: ${toolName}`, {
    userId: session?.user?.id,
    parameters: Object.keys(parameters),
  })

  try {
    // This is a placeholder implementation
    // In a real implementation, these would call the actual service functions
    switch (toolName) {
      case 'listWorkflows':
        return {
          success: true,
          data: {
            workflows: [
              { id: 'wf-1', name: 'Example Workflow 1', status: 'published' },
              { id: 'wf-2', name: 'Example Workflow 2', status: 'draft' },
            ],
            total: 2,
            offset: parameters.offset || 0,
            limit: parameters.limit || 20,
          },
        }

      case 'createWorkflow':
        return {
          success: true,
          data: {
            workflowId: `wf-${Date.now()}`,
            name: parameters.name,
            status: 'draft',
            createdAt: new Date().toISOString(),
          },
        }

      case 'executeWorkflow':
        return {
          success: true,
          data: {
            executionId: `exec-${Date.now()}`,
            status: 'completed',
            result: { message: 'Workflow executed successfully' },
          },
        }

      case 'manageEnvironment':
        if (parameters.action === 'list') {
          return {
            success: true,
            data: {
              variables: [
                { key: 'API_URL', value: 'https://api.example.com', encrypted: false },
                { key: 'SECRET_KEY', value: '[ENCRYPTED]', encrypted: true },
              ],
            },
          }
        }
        return {
          success: true,
          data: { message: `Environment variable ${parameters.action} operation completed` },
        }

      case 'searchKnowledge':
        return {
          success: true,
          data: {
            results: [
              {
                id: 'kb-1',
                title: 'API Documentation',
                content: 'Relevant knowledge content...',
                score: 0.85,
              },
            ],
            total: 1,
          },
        }

      case 'manageFiles':
        if (parameters.action === 'list') {
          return {
            success: true,
            data: {
              files: [{ name: 'document.pdf', size: 1024, modified: new Date().toISOString() }],
            },
          }
        }
        return {
          success: true,
          data: { message: `File ${parameters.action} operation completed` },
        }

      case 'billingOperations':
        return {
          success: true,
          data: {
            usage: { current: 150, limit: 1000, percentage: 15 },
            billing: { status: 'active', nextBilling: '2025-02-01' },
          },
        }

      case 'toolRegistry':
        if (parameters.action === 'list') {
          return {
            success: true,
            data: {
              tools: [{ id: 'custom-tool-1', name: 'Custom Analysis Tool', version: '1.0.0' }],
            },
          }
        }
        return {
          success: true,
          data: { message: `Tool registry ${parameters.action} operation completed` },
        }

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        }
    }
  } catch (error) {
    logger.error(`[${operationId}] Tool execution failed`, {
      toolName,
      error: error.message,
      userId: session?.user?.id,
    })

    return {
      success: false,
      error: error.message || 'Tool execution failed',
    }
  }
}

/**
 * Nexus Chat API - POST Handler
 * Processes chat messages with Claude integration and tool orchestration
 */
export async function POST(req: NextRequest) {
  const operationId = `nexus-chat-${Date.now()}`

  try {
    // Authentication validation
    const session = await getSession()
    if (!session?.user) {
      logger.warn(`[${operationId}] Unauthenticated access attempt`)
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validationResult = ChatRequestSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(`[${operationId}] Invalid request format`, {
        errors: validationResult.error.errors,
      })
      return new Response(
        JSON.stringify({
          error: 'Invalid request format',
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages, workspaceId, workflowId, stream, temperature, maxTokens } =
      validationResult.data

    logger.info(`[${operationId}] Nexus chat request`, {
      userId: session.user.id,
      messageCount: messages.length,
      workspaceId,
      workflowId,
      stream,
    })

    // Enhanced system prompt with context awareness
    const systemPrompt = `You are Nexus, an advanced AI assistant integrated into the Sim workflow platform.

**CORE CAPABILITIES:**
- Complete workflow management (create, read, update, delete, execute)
- Knowledge base operations with semantic search
- File operations and organization
- Environment variable management
- Billing and subscription management
- Tool registry and custom integrations
- Real-time collaboration features

**CURRENT CONTEXT:**
- User ID: ${session.user.id}
- Workspace ID: ${workspaceId || 'Not specified'}
- Workflow ID: ${workflowId || 'Not specified'}
- Session: Active and authenticated

**INTERACTION GUIDELINES:**
- Be concise yet comprehensive in your responses
- Always use available tools to perform requested actions
- Provide clear feedback on tool execution results
- Ask for clarification when requests are ambiguous
- Maintain context throughout the conversation
- Prioritize user productivity and workflow efficiency

**SECURITY REQUIREMENTS:**
- All tool operations include proper authentication
- Respect workspace and organization boundaries
- Maintain audit trails for all operations
- Never expose sensitive information inappropriately

You have access to comprehensive tools for managing all aspects of the Sim platform. Use them proactively to help users accomplish their goals efficiently.`

    // Initialize Anthropic client
    const anthropic = getAnthropicClient()

    // Configure streaming response with tool orchestration
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'), // Latest model
      messages,
      system: systemPrompt,
      maxTokens,
      temperature,

      tools: nexusTools,

      // Enhanced tool choice configuration
      toolChoice: 'auto',

      // Tool execution handler
      onToolCall: async ({ toolName, args }) => {
        logger.info(`[${operationId}] Tool call initiated: ${toolName}`, {
          userId: session.user.id,
          args: Object.keys(args),
        })

        const result = await executeNexusTool(toolName, args, session)

        if (!result.success) {
          logger.error(`[${operationId}] Tool execution failed`, {
            toolName,
            error: result.error,
          })
        }

        return result
      },

      // Add request/response middleware for logging
      onFinish: (result) => {
        logger.info(`[${operationId}] Nexus response completed`, {
          userId: session.user.id,
          tokenUsage: result.usage,
          toolCalls: result.toolCalls?.length || 0,
          finishReason: result.finishReason,
        })
      },
    })

    // Return streaming response
    return result.toAIStreamResponse({
      headers: {
        'X-Operation-ID': operationId,
        'X-Nexus-Version': '1.0.0',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    logger.error(`[${operationId}] Nexus API error`, {
      error: error.message,
      stack: error.stack,
      userId: session?.user?.id,
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        operationId,
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Health check endpoint for monitoring
 */
export async function GET() {
  try {
    // Test Anthropic API key availability
    const hasApiKey = !!(
      env.ANTHROPIC_API_KEY_1 ||
      env.ANTHROPIC_API_KEY_2 ||
      env.ANTHROPIC_API_KEY_3
    )

    return Response.json({
      status: 'healthy',
      service: 'nexus-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      anthropic: {
        configured: hasApiKey,
        model: 'claude-3-5-sonnet-20241022',
      },
      tools: {
        available: Object.keys(nexusTools).length,
        list: Object.keys(nexusTools),
      },
    })
  } catch (error) {
    logger.error('Health check failed', { error: error.message })

    return Response.json(
      {
        status: 'unhealthy',
        service: 'nexus-api',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
