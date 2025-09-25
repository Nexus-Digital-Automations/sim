/**
 * Local Copilot Chat API Endpoint
 *
 * Handles streaming conversations with Parlant agents for the local copilot system.
 * This endpoint provides similar functionality to the external copilot but uses
 * local Parlant agents instead of external APIs.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { validateWorkspaceAccess } from '@/lib/auth/chat-middleware'
import { createLogger } from '@/lib/logs/console/logger'
import { env } from '@/lib/env'
import { agentService } from '@/services/parlant/agent-service'
import { createConversation, getUserConversations } from '@/lib/parlant/conversations'
import { createFileContent, isSupportedFileType } from '@/lib/uploads/file-utils'
import { downloadFile, getStorageProvider } from '@/lib/uploads/storage-client'
import { S3_COPILOT_CONFIG } from '@/lib/uploads/setup'

const logger = createLogger('LocalCopilotChatAPI')

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  conversationId: z.string().optional(),
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  stream: z.boolean().optional().default(true),
  fileAttachments: z
    .array(
      z.object({
        id: z.string(),
        key: z.string(),
        filename: z.string(),
        media_type: z.string(),
        size: z.number(),
      })
    )
    .optional(),
  contexts: z
    .array(
      z.object({
        kind: z.enum(['workflow', 'execution', 'block', 'knowledge', 'past_chat']),
        label: z.string(),
        workflowId: z.string().optional(),
        executionId: z.string().optional(),
        blockId: z.string().optional(),
        chatId: z.string().optional(),
        data: z.any().optional(),
      })
    )
    .optional(),
})

/**
 * POST /api/local-copilot/chat
 * Send message to local Parlant agent with streaming response
 */
export async function POST(req: NextRequest) {
  const requestId = `local_copilot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    logger.info(`[${requestId}] Local copilot chat request received`)

    // Authenticate user
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request
    const body = await req.json()
    const {
      message,
      agentId,
      conversationId,
      workspaceId,
      stream,
      fileAttachments,
      contexts,
    } = ChatRequestSchema.parse(body)

    // Validate workspace access
    const access = await validateWorkspaceAccess(session.user.id, workspaceId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    logger.info(`[${requestId}] Chat request validated`, {
      userId: session.user.id,
      workspaceId,
      agentId,
      conversationId,
      messageLength: message.length,
      hasAttachments: !!fileAttachments?.length,
      hasContexts: !!contexts?.length,
    })

    // Verify agent access
    try {
      const agentResponse = await agentService.getAgent(agentId, {
        user_id: session.user.id,
        workspace_id: workspaceId,
      })

      if (!agentResponse.success || !agentResponse.data) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied to agent or agent not found' },
          { status: 403 }
        )
      }

      logger.info(`[${requestId}] Agent access verified`, {
        agentName: agentResponse.data.name,
        agentStatus: agentResponse.data.status,
      })
    } catch (error) {
      logger.error(`[${requestId}] Agent verification failed`, { error })
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to verify agent access' },
        { status: 500 }
      )
    }

    // Process file attachments if present
    const processedFileContents: any[] = []
    if (fileAttachments && fileAttachments.length > 0) {
      logger.info(`[${requestId}] Processing ${fileAttachments.length} file attachments`)

      for (const attachment of fileAttachments) {
        try {
          if (!isSupportedFileType(attachment.media_type)) {
            logger.warn(`[${requestId}] Unsupported file type: ${attachment.media_type}`)
            continue
          }

          const storageProvider = getStorageProvider()
          let fileBuffer: Buffer

          if (storageProvider === 's3') {
            fileBuffer = await downloadFile(attachment.key, {
              bucket: S3_COPILOT_CONFIG.bucket,
              region: S3_COPILOT_CONFIG.region,
            })
          } else if (storageProvider === 'blob') {
            const { BLOB_COPILOT_CONFIG } = await import('@/lib/uploads/setup')
            fileBuffer = await downloadFile(attachment.key, {
              containerName: BLOB_COPILOT_CONFIG.containerName,
              accountName: BLOB_COPILOT_CONFIG.accountName,
              accountKey: BLOB_COPILOT_CONFIG.accountKey,
              connectionString: BLOB_COPILOT_CONFIG.connectionString,
            })
          } else {
            fileBuffer = await downloadFile(attachment.key)
          }

          const fileContent = createFileContent(fileBuffer, attachment.media_type)
          if (fileContent) {
            processedFileContents.push(fileContent)
            logger.info(`[${requestId}] Processed file: ${attachment.filename}`)
          }
        } catch (error) {
          logger.error(`[${requestId}] Failed to process file ${attachment.filename}:`, error)
        }
      }
    }

    // Handle conversation context
    let currentConversation: any = null
    let conversationHistory: any[] = []

    if (conversationId) {
      try {
        // Load existing conversation
        const conversations = await getUserConversations(session.user.id, workspaceId, {
          conversationId,
          page: 1,
          limit: 1,
        })

        if (conversations.conversations.length > 0) {
          currentConversation = conversations.conversations[0]
          conversationHistory = currentConversation.messages || []
        }

        logger.info(`[${requestId}] Loaded conversation history`, {
          conversationId,
          messageCount: conversationHistory.length,
        })
      } catch (error) {
        logger.error(`[${requestId}] Failed to load conversation:`, error)
        // Continue without conversation history
      }
    }

    // Build messages array for Parlant agent
    const messages: any[] = []

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.fileAttachments && msg.fileAttachments.length > 0) {
        // Message with files - use content array format
        const content: any[] = [{ type: 'text', text: msg.content }]

        // Add file contents (simplified - in production would need proper file handling)
        for (const attachment of msg.fileAttachments) {
          try {
            if (isSupportedFileType(attachment.media_type)) {
              // Add file reference (implementation details would vary)
              content.push({
                type: 'file',
                filename: attachment.filename,
                media_type: attachment.media_type,
              })
            }
          } catch (error) {
            logger.error(`[${requestId}] Failed to process historical file:`, error)
          }
        }

        messages.push({
          role: msg.role,
          content,
        })
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add current user message
    if (processedFileContents.length > 0) {
      const content: any[] = [{ type: 'text', text: message }]
      for (const fileContent of processedFileContents) {
        content.push(fileContent)
      }

      messages.push({
        role: 'user',
        content,
      })
    } else {
      messages.push({
        role: 'user',
        content: message,
      })
    }

    // Process contexts if provided
    let processedContexts: any[] = []
    if (contexts && contexts.length > 0) {
      try {
        // Import context processing from existing copilot system
        const { processContextsServer } = await import('@/lib/copilot/process-contents')
        processedContexts = await processContextsServer(contexts, session.user.id, message)

        logger.info(`[${requestId}] Processed contexts`, {
          contextCount: processedContexts.length,
        })
      } catch (error) {
        logger.error(`[${requestId}] Failed to process contexts:`, error)
      }
    }

    // Prepare request payload for Parlant
    const parlantPayload = {
      messages,
      agentId,
      userId: session.user.id,
      workspaceId,
      stream,
      conversationId,
      contexts: processedContexts,
      metadata: {
        requestId,
        source: 'local-copilot',
        userAgent: req.headers.get('user-agent'),
      },
    }

    logger.info(`[${requestId}] Sending request to Parlant`, {
      messageCount: messages.length,
      hasContexts: processedContexts.length > 0,
      streamEnabled: stream,
    })

    // Make request to Parlant server
    const parlantUrl = `${env.PARLANT_SERVER_URL || 'http://localhost:8001'}/api/chat`
    const parlantResponse = await fetch(parlantUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-User-ID': session.user.id,
        'X-Workspace-ID': workspaceId,
      },
      body: JSON.stringify(parlantPayload),
    })

    if (!parlantResponse.ok) {
      const errorText = await parlantResponse.text().catch(() => '')
      logger.error(`[${requestId}] Parlant API error:`, {
        status: parlantResponse.status,
        error: errorText,
      })

      return NextResponse.json(
        {
          error: `Local copilot error: ${parlantResponse.statusText}`,
          details: errorText,
        },
        { status: parlantResponse.status }
      )
    }

    // Handle streaming response
    if (stream && parlantResponse.body) {
      logger.info(`[${requestId}] Starting stream processing`)

      // Create transform stream to add local copilot metadata
      const transformedStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          // Send initial metadata
          const initEvent = `data: ${JSON.stringify({
            type: 'init',
            requestId,
            agentId,
            conversationId,
            timestamp: new Date().toISOString(),
          })}\n\n`
          controller.enqueue(encoder.encode(initEvent))

          // Process Parlant stream
          const reader = parlantResponse.body!.getReader()
          const decoder = new TextDecoder()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Forward chunks with optional processing
              const chunk = decoder.decode(value, { stream: true })

              // Add local copilot specific processing if needed
              // For now, we'll forward the stream as-is
              controller.enqueue(value)
            }
          } catch (error) {
            logger.error(`[${requestId}] Stream processing error:`, error)

            const errorEvent = `data: ${JSON.stringify({
              type: 'error',
              error: 'Stream processing failed',
              requestId,
            })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
          } finally {
            controller.close()
          }
        },
      })

      logger.info(`[${requestId}] Returning streaming response`)

      return new Response(transformedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Request-ID': requestId,
        },
      })
    }

    // Handle non-streaming response
    const responseData = await parlantResponse.json()

    logger.info(`[${requestId}] Non-streaming response from Parlant`, {
      hasContent: !!responseData.content,
      contentLength: responseData.content?.length || 0,
      hasToolCalls: !!responseData.toolCalls?.length,
    })

    return NextResponse.json({
      success: true,
      response: responseData,
      requestId,
      metadata: {
        source: 'local-copilot',
        agentId,
        conversationId,
        timestamp: new Date().toISOString(),
      },
    })

  } catch (error) {
    logger.error(`[${requestId}] Local copilot chat error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors,
          requestId,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId,
      },
      { status: 500 }
    )
  }
}