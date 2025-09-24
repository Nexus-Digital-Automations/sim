/**
 * Slack Tool Adapter
 * ==================
 *
 * Adapter for Slack messaging and workspace operations
 * Converts Sim's Slack block to Parlant-compatible format
 */

import { UniversalToolAdapter, ParlantTool, ToolExecutionContext, AdapterExecutionResult } from '../adapter-framework'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'

export class SlackAdapter extends UniversalToolAdapter {
  constructor(blockConfig: BlockConfig) {
    super(blockConfig)
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'slack',
      name: 'Slack Messaging',
      description: 'Send messages, files, and interact with Slack workspaces and channels',
      longDescription: 'Comprehensive Slack integration for sending messages to channels or users, uploading files, managing conversations, and automating workplace communication.',
      category: 'communication',
      parameters: [
        {
          name: 'action',
          description: 'The Slack action to perform',
          type: 'string',
          required: true,
          constraints: {
            enum: ['send_message', 'send_file', 'get_channel_info', 'list_channels', 'get_user_info']
          },
          examples: ['send_message', 'send_file', 'list_channels']
        },
        {
          name: 'channel',
          description: 'The Slack channel name or ID (with # prefix for channels, @ for direct messages)',
          type: 'string',
          required: false,
          examples: ['#general', '#random', '@john.doe', 'C1234567890'],
          dependsOn: {
            parameter: 'action',
            value: ['send_message', 'send_file', 'get_channel_info']
          }
        },
        {
          name: 'message',
          description: 'The message text to send',
          type: 'string',
          required: false,
          examples: [
            'Hello team! Meeting starts in 10 minutes.',
            'The deployment completed successfully ✅',
            'New feature release is now live!'
          ],
          dependsOn: {
            parameter: 'action',
            value: 'send_message'
          }
        },
        {
          name: 'file_url',
          description: 'URL of the file to upload to Slack',
          type: 'string',
          required: false,
          examples: [
            'https://example.com/document.pdf',
            'https://example.com/image.png'
          ],
          dependsOn: {
            parameter: 'action',
            value: 'send_file'
          }
        },
        {
          name: 'file_name',
          description: 'Name for the uploaded file (optional)',
          type: 'string',
          required: false,
          examples: ['meeting-notes.pdf', 'screenshot.png'],
          dependsOn: {
            parameter: 'action',
            value: 'send_file'
          }
        },
        {
          name: 'thread_timestamp',
          description: 'Timestamp of the parent message to reply in thread (optional)',
          type: 'string',
          required: false,
          examples: ['1234567890.123456']
        },
        {
          name: 'user_id',
          description: 'Slack user ID for user-specific operations',
          type: 'string',
          required: false,
          examples: ['U1234567890'],
          dependsOn: {
            parameter: 'action',
            value: 'get_user_info'
          }
        },
        {
          name: 'bot_token',
          description: 'Slack Bot User OAuth Token for authentication',
          type: 'string',
          required: true,
          examples: ['xoxb-your-bot-token']
        }
      ],
      outputs: [
        {
          name: 'success',
          description: 'Whether the Slack operation was successful',
          type: 'boolean'
        },
        {
          name: 'message_ts',
          description: 'Timestamp of the sent message (for message operations)',
          type: 'string',
          optional: true
        },
        {
          name: 'channel_info',
          description: 'Information about the channel',
          type: 'object',
          optional: true
        },
        {
          name: 'file_info',
          description: 'Information about the uploaded file',
          type: 'object',
          optional: true
        },
        {
          name: 'user_info',
          description: 'Information about the user',
          type: 'object',
          optional: true
        },
        {
          name: 'channels',
          description: 'List of channels (for list_channels operation)',
          type: 'array',
          optional: true
        }
      ],
      examples: [
        {
          scenario: 'Send a message to a channel',
          input: {
            action: 'send_message',
            channel: '#general',
            message: 'Deployment completed successfully! 🚀',
            bot_token: 'xoxb-your-token'
          },
          expectedOutput: 'Returns success status and message timestamp'
        },
        {
          scenario: 'Send a file to a channel with description',
          input: {
            action: 'send_file',
            channel: '#team-updates',
            file_url: 'https://example.com/report.pdf',
            file_name: 'weekly-report.pdf',
            bot_token: 'xoxb-your-token'
          },
          expectedOutput: 'Returns file upload confirmation and file information'
        },
        {
          scenario: 'Reply to a message in a thread',
          input: {
            action: 'send_message',
            channel: '#general',
            message: 'Thanks for the update!',
            thread_timestamp: '1234567890.123456',
            bot_token: 'xoxb-your-token'
          },
          expectedOutput: 'Sends reply in the specified thread'
        },
        {
          scenario: 'List all public channels',
          input: {
            action: 'list_channels',
            bot_token: 'xoxb-your-token'
          },
          expectedOutput: 'Returns array of channel objects with names and IDs'
        }
      ],
      usageHints: [
        'Bot token must have appropriate scopes (chat:write, files:write, channels:read, etc.)',
        'Channel names should include # prefix for public channels',
        'Use @ prefix for direct messages to users',
        'Thread timestamps are used to reply to existing messages',
        'File uploads support various formats (images, documents, code files)',
        'Rate limiting applies - avoid sending too many messages quickly'
      ],
      requiresAuth: {
        type: 'oauth',
        provider: 'slack',
        scopes: ['chat:write', 'files:write', 'channels:read', 'users:read']
      }
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    const baseParams = {
      action: parlantParams.action,
      token: parlantParams.bot_token
    }

    // Add action-specific parameters
    switch (parlantParams.action) {
      case 'send_message':
        return {
          ...baseParams,
          channel: parlantParams.channel,
          text: parlantParams.message,
          thread_ts: parlantParams.thread_timestamp
        }

      case 'send_file':
        return {
          ...baseParams,
          channels: parlantParams.channel,
          file_url: parlantParams.file_url,
          filename: parlantParams.file_name,
          initial_comment: parlantParams.message // Optional comment with file
        }

      case 'get_channel_info':
        return {
          ...baseParams,
          channel: parlantParams.channel
        }

      case 'get_user_info':
        return {
          ...baseParams,
          user: parlantParams.user_id
        }

      default:
        return baseParams
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    try {
      const baseUrl = 'https://slack.com/api'
      const headers = {
        'Authorization': `Bearer ${simParams.token}`,
        'Content-Type': 'application/json'
      }

      let endpoint: string
      let body: any

      // Build request based on action
      switch (simParams.action) {
        case 'send_message':
          endpoint = 'chat.postMessage'
          body = {
            channel: simParams.channel,
            text: simParams.text,
            thread_ts: simParams.thread_ts
          }
          break

        case 'send_file':
          endpoint = 'files.upload'
          // For file upload, we'd need to handle the file differently
          body = {
            channels: simParams.channels,
            filename: simParams.filename,
            initial_comment: simParams.initial_comment
          }
          // Note: In real implementation, we'd fetch the file from file_url and upload it
          break

        case 'get_channel_info':
          endpoint = 'conversations.info'
          body = { channel: simParams.channel }
          break

        case 'list_channels':
          endpoint = 'conversations.list'
          body = { types: 'public_channel,private_channel' }
          break

        case 'get_user_info':
          endpoint = 'users.info'
          body = { user: simParams.user }
          break

        default:
          throw new Error(`Unknown Slack action: ${simParams.action}`)
      }

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
      }

      return {
        success: true,
        output: {
          success: true,
          action: simParams.action,
          response: data,
          ...this.extractActionSpecificData(data, simParams.action)
        },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }

    } catch (error) {
      return {
        success: false,
        output: { success: false },
        error: error instanceof Error ? error.message : 'Slack API error',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || 'Slack operation failed')
    }

    const baseResult = {
      success: simResult.output.success,
      action_performed: simResult.output.action
    }

    // Add action-specific results
    const action = simResult.output.action
    switch (action) {
      case 'send_message':
        return {
          ...baseResult,
          message_ts: simResult.output.message_ts,
          channel: simResult.output.channel,
          message_sent: true
        }

      case 'send_file':
        return {
          ...baseResult,
          file_info: simResult.output.file_info,
          file_uploaded: true
        }

      case 'get_channel_info':
        return {
          ...baseResult,
          channel_info: simResult.output.channel_info
        }

      case 'list_channels':
        return {
          ...baseResult,
          channels: simResult.output.channels
        }

      case 'get_user_info':
        return {
          ...baseResult,
          user_info: simResult.output.user_info
        }

      default:
        return baseResult
    }
  }

  protected async calculateUsage(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    const action = simResult.output.action

    // Different actions have different costs
    const actionCosts = {
      'send_message': 1,
      'send_file': 3,
      'get_channel_info': 1,
      'list_channels': 2,
      'get_user_info': 1
    }

    return {
      apiCallsCount: 1,
      computeUnits: actionCosts[action] || 1,
      slackApiCallsUsed: 1
    }
  }

  /**
   * Extract action-specific data from Slack API response
   */
  private extractActionSpecificData(data: any, action: string): any {
    switch (action) {
      case 'send_message':
        return {
          message_ts: data.ts,
          channel: data.channel
        }

      case 'send_file':
        return {
          file_info: {
            id: data.file?.id,
            name: data.file?.name,
            url: data.file?.url_private,
            size: data.file?.size,
            mimetype: data.file?.mimetype
          }
        }

      case 'get_channel_info':
        return {
          channel_info: {
            id: data.channel?.id,
            name: data.channel?.name,
            topic: data.channel?.topic?.value,
            purpose: data.channel?.purpose?.value,
            member_count: data.channel?.num_members,
            created: data.channel?.created
          }
        }

      case 'list_channels':
        return {
          channels: data.channels?.map(channel => ({
            id: channel.id,
            name: channel.name,
            is_member: channel.is_member,
            topic: channel.topic?.value,
            purpose: channel.purpose?.value,
            member_count: channel.num_members
          }))
        }

      case 'get_user_info':
        return {
          user_info: {
            id: data.user?.id,
            name: data.user?.name,
            real_name: data.user?.real_name,
            email: data.user?.profile?.email,
            title: data.user?.profile?.title,
            status: data.user?.profile?.status_text
          }
        }

      default:
        return {}
    }
  }
}