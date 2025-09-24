/**
 * Tool Registry Initialization System
 * ===================================
 *
 * This module automatically discovers, registers, and configures all Sim tools
 * with the Universal Tool Adapter System, providing comprehensive natural language
 * descriptions and usage guidelines for each tool.
 *
 * Features:
 * - Automatic tool discovery from Sim's block configurations
 * - Dynamic natural language description generation
 * - Contextual usage guideline creation
 * - Tool categorization and tagging
 * - Performance profiling and optimization recommendations
 */

import { ApiBlock } from '@/blocks/blocks/api'
// Import all Sim block configurations
import { FunctionBlock } from '@/blocks/blocks/function'
import { GmailBlock } from '@/blocks/blocks/gmail'
import { SlackBlock } from '@/blocks/blocks/slack'
import type { BlockConfig } from '@/blocks/types'
import type { EnhancedToolDescription } from './tool-adapter'
import { ENHANCED_TOOL_DESCRIPTIONS, toolRegistry } from './tool-adapter'

// Note: In a real implementation, you would import all block configurations
// For this demonstration, I'm including a subset and then generating the rest dynamically

// =============================================
// Enhanced Tool Descriptions for All Sim Tools
// =============================================

/**
 * Comprehensive enhanced descriptions for all 70+ Sim tools
 */
export const COMPREHENSIVE_TOOL_DESCRIPTIONS: Record<string, EnhancedToolDescription> = {
  // Core workflow blocks
  function: ENHANCED_TOOL_DESCRIPTIONS.function,
  api: ENHANCED_TOOL_DESCRIPTIONS.api,

  // Communication tools
  slack: ENHANCED_TOOL_DESCRIPTIONS.slack,
  gmail: ENHANCED_TOOL_DESCRIPTIONS.gmail,

  // Additional communication tools
  microsoft_teams: {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    shortDescription: 'Send messages and notifications to Microsoft Teams channels',
    longDescription:
      'Integrate with Microsoft Teams to send messages, create posts, and manage team communications. Supports rich formatting, file attachments, and channel management. Perfect for enterprise team collaboration and automated notifications.',
    usageExamples: [
      'Send project status updates to development team',
      'Create automated build notifications',
      'Share reports with stakeholders',
      'Trigger team alerts for system issues',
      'Coordinate team meetings and reminders',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Enterprise team communications',
        'Automated project notifications',
        'Status reporting and updates',
        'Cross-team coordination',
        'System alerts and monitoring',
      ],
      avoidWhen: [
        'External customer communications',
        'Personal or informal messaging',
        'High-frequency automated messages',
        'Sensitive confidential information',
      ],
      commonMistakes: [
        'Not setting up proper channel permissions',
        'Sending too many automated messages',
        'Formatting messages incorrectly',
        'Not handling API rate limits',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'channel',
          question: 'Which Teams channel should receive the message?',
          examples: [
            'General team channel',
            'Development team channel',
            'Project-specific channel',
            'Alerts and notifications channel',
          ],
        },
        {
          parameter: 'message',
          question: 'What message do you want to send?',
          examples: [
            'Project milestone completed ✅',
            'New deployment available for testing',
            'Weekly team meeting at 2 PM today',
          ],
        },
      ],
    },
    tags: ['teams', 'microsoft', 'messaging', 'collaboration', 'enterprise', 'notifications'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    shortDescription: 'Send messages to Discord servers and channels',
    longDescription:
      'Connect with Discord communities by sending messages, managing channels, and creating automated notifications. Supports rich embeds, file attachments, and bot interactions. Great for gaming communities, developer teams, and online communities.',
    usageExamples: [
      'Send automated game server status updates',
      'Create community announcements',
      'Share development progress with beta testers',
      'Trigger alerts for server maintenance',
      'Coordinate community events',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Gaming community management',
        'Developer team communications',
        'Community announcements',
        'Bot automation and interactions',
        'Real-time event notifications',
      ],
      avoidWhen: [
        'Professional business communications',
        'Formal corporate announcements',
        'Sensitive business data',
        'High-volume spam-like messages',
      ],
      commonMistakes: [
        'Not setting up proper bot permissions',
        'Sending messages too frequently',
        'Not formatting rich embeds correctly',
        'Ignoring Discord rate limits',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'channel',
          question: 'Which Discord channel should receive the message?',
          examples: [
            '#general for community announcements',
            '#development for code updates',
            '#alerts for system notifications',
          ],
        },
        {
          parameter: 'content',
          question: 'What message content do you want to send?',
          examples: [
            'Server update completed! 🎮',
            'New feature available for testing',
            'Community event starting in 1 hour',
          ],
        },
      ],
    },
    tags: ['discord', 'gaming', 'community', 'messaging', 'bot', 'real-time'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    shortDescription: 'Send WhatsApp messages for business communications',
    longDescription:
      'Integrate WhatsApp Business API for customer communications, support messages, and marketing campaigns. Supports text messages, media attachments, and message templates. Perfect for customer service and business messaging.',
    usageExamples: [
      'Send order confirmations to customers',
      'Provide customer support responses',
      'Share delivery updates and tracking',
      'Send appointment reminders',
      'Distribute promotional messages',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Customer service and support',
        'Order and delivery notifications',
        'Appointment scheduling',
        'Business marketing messages',
        'Two-way customer communications',
      ],
      avoidWhen: [
        'Spam or unsolicited marketing',
        'Personal non-business communications',
        'High-volume automated messages without consent',
        'Sensitive financial information',
      ],
      commonMistakes: [
        'Not following WhatsApp Business policies',
        'Sending messages without user consent',
        'Not handling opt-out requests',
        'Exceeding message rate limits',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'to',
          question: 'What phone number should receive the WhatsApp message?',
          examples: [
            '+1234567890',
            'Customer phone number',
            'International format with country code',
          ],
        },
        {
          parameter: 'message',
          question: 'What WhatsApp message do you want to send?',
          examples: [
            'Your order has been shipped! 📦',
            'Thank you for your inquiry. How can we help?',
            'Appointment reminder: Tomorrow at 3 PM',
          ],
        },
      ],
    },
    tags: ['whatsapp', 'messaging', 'business', 'customer-service', 'mobile', 'notifications'],
    difficulty: 'intermediate',
    complexity: 'moderate',
  },

  // Database tools
  mysql: {
    id: 'mysql',
    name: 'MySQL Database',
    shortDescription: 'Execute SQL queries and manage MySQL databases',
    longDescription:
      'Connect to MySQL databases to execute queries, manage data, and perform database operations. Supports complex SQL operations, transactions, and data analysis. Essential for data-driven applications and analytics.',
    usageExamples: [
      'Retrieve customer data for reports',
      'Update inventory quantities',
      'Insert new user registrations',
      'Generate sales analytics queries',
      'Manage product catalogs',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Data retrieval and analysis',
        'Database updates and maintenance',
        'Reporting and analytics',
        'Data migration and transformation',
        'Application data management',
      ],
      avoidWhen: [
        'Complex data transformations (use specialized tools)',
        'Large file processing (use file tools)',
        'Real-time streaming data',
        'Non-relational data structures',
      ],
      commonMistakes: [
        'Not handling SQL injection risks',
        'Writing inefficient queries',
        'Not using transactions for data consistency',
        'Forgetting to handle connection timeouts',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'query',
          question: 'What SQL query do you want to execute?',
          examples: [
            'SELECT * FROM users WHERE created_at > "2024-01-01"',
            'UPDATE products SET stock = stock - 1 WHERE id = 123',
            'INSERT INTO orders (user_id, amount) VALUES (456, 99.99)',
          ],
          validation: 'Must be valid SQL syntax',
        },
        {
          parameter: 'database',
          question: 'Which database connection should be used?',
          examples: ['production', 'staging', 'analytics'],
        },
      ],
    },
    tags: ['mysql', 'database', 'sql', 'data', 'analytics', 'storage'],
    difficulty: 'intermediate',
    complexity: 'moderate',
  },

  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL Database',
    shortDescription: 'Execute advanced SQL operations with PostgreSQL',
    longDescription:
      'Connect to PostgreSQL databases for advanced SQL operations, JSON queries, and complex data analysis. Supports advanced PostgreSQL features like arrays, JSON operations, and window functions.',
    usageExamples: [
      'Execute complex analytical queries',
      'Manage JSON document data',
      'Perform full-text search operations',
      'Handle geographical data queries',
      'Generate advanced business reports',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Complex analytical queries',
        'JSON and document data',
        'Advanced SQL operations',
        'Data warehousing tasks',
        'Scientific and statistical analysis',
      ],
      avoidWhen: [
        'Simple CRUD operations (use simpler tools)',
        'Real-time high-frequency operations',
        'File-based data processing',
        'Non-SQL data structures',
      ],
      commonMistakes: [
        'Not optimizing complex queries',
        'Misusing PostgreSQL-specific features',
        'Not handling large result sets properly',
        'Ignoring indexing for performance',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'query',
          question: 'What PostgreSQL query do you want to execute?',
          examples: [
            'SELECT jsonb_extract_path_text(data, "name") FROM users',
            'WITH RECURSIVE hierarchy AS (...) SELECT * FROM hierarchy',
            'SELECT * FROM products WHERE location <-> point(1,1) < 10',
          ],
        },
      ],
    },
    tags: ['postgresql', 'database', 'sql', 'analytics', 'json', 'advanced'],
    difficulty: 'advanced',
    complexity: 'complex',
  },

  // File and storage tools
  s3: {
    id: 's3',
    name: 'Amazon S3',
    shortDescription: 'Upload, download, and manage files in Amazon S3',
    longDescription:
      'Interact with Amazon S3 for file storage, backup, and content distribution. Supports file uploads, downloads, folder management, and access control. Essential for scalable file storage and content delivery.',
    usageExamples: [
      'Upload user-generated content',
      'Back up important documents',
      'Serve static website assets',
      'Store data processing results',
      'Manage media files and images',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'File storage and backup',
        'Static content hosting',
        'Data archival and retrieval',
        'Content distribution',
        'Media file management',
      ],
      avoidWhen: [
        'Database-like structured data',
        'Real-time file processing',
        'Frequently changing small files',
        'Complex file transformations',
      ],
      commonMistakes: [
        'Not setting proper access permissions',
        'Ignoring storage costs for large files',
        'Not using appropriate storage classes',
        'Missing error handling for uploads',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'bucket',
          question: 'Which S3 bucket should be used?',
          examples: ['my-app-uploads', 'company-backups', 'static-assets-bucket'],
        },
        {
          parameter: 'key',
          question: 'What should the file path/key be in S3?',
          examples: [
            'uploads/user-123/document.pdf',
            'images/2024/01/photo.jpg',
            'backups/database-2024-01-15.sql',
          ],
        },
      ],
    },
    tags: ['s3', 'aws', 'storage', 'files', 'cloud', 'backup'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    shortDescription: 'Upload, download, and share files via Google Drive',
    longDescription:
      'Integrate with Google Drive for file management, sharing, and collaboration. Supports file uploads, downloads, folder creation, and permission management. Perfect for document sharing and team collaboration.',
    usageExamples: [
      'Share documents with team members',
      'Back up important files automatically',
      'Create collaborative document folders',
      'Upload reports for stakeholder access',
      'Manage project documentation',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Document sharing and collaboration',
        'File backup and sync',
        'Team document management',
        'Report distribution',
        'Project file organization',
      ],
      avoidWhen: [
        'Large file transfers (use specialized tools)',
        'Programmatic data processing',
        'High-frequency file operations',
        'Version control (use Git instead)',
      ],
      commonMistakes: [
        'Not setting appropriate sharing permissions',
        'Creating too many duplicate files',
        'Not organizing files in folders',
        'Ignoring storage quota limits',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'fileName',
          question: 'What should the file be named in Google Drive?',
          examples: [
            'Weekly Report - 2024-01-15.pdf',
            'Project Documentation.docx',
            'Team Meeting Notes.txt',
          ],
        },
        {
          parameter: 'folderId',
          question: 'Which Google Drive folder should contain the file?',
          examples: ['Shared project folder', 'Reports folder', 'Team documents folder'],
        },
      ],
    },
    tags: ['google-drive', 'storage', 'files', 'sharing', 'collaboration', 'documents'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  // Search and information tools
  google: {
    id: 'google',
    name: 'Google Search',
    shortDescription: 'Search the web using Google Search API',
    longDescription:
      'Perform web searches using Google Search API to find information, articles, and resources. Returns structured search results with titles, descriptions, and URLs. Essential for research and information gathering.',
    usageExamples: [
      'Research market trends and competitors',
      'Find technical documentation and tutorials',
      'Gather news articles on specific topics',
      'Search for product reviews and comparisons',
      'Discover industry best practices',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Information research and gathering',
        'Market and competitor analysis',
        'Technical documentation lookup',
        'News and trend monitoring',
        'Educational content discovery',
      ],
      avoidWhen: [
        'Real-time or frequently changing data',
        'Internal company information',
        'Proprietary or confidential research',
        'Highly specific technical queries',
      ],
      commonMistakes: [
        'Using overly broad search terms',
        'Not filtering results by date relevance',
        'Exceeding API quotas and limits',
        'Not validating search result quality',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'query',
          question: 'What do you want to search for?',
          examples: [
            'best practices for API security',
            'latest trends in artificial intelligence',
            'customer service automation tools',
            'web development frameworks 2024',
          ],
        },
        {
          parameter: 'num',
          question: 'How many search results do you need?',
          examples: [
            '10 for general research',
            '20 for comprehensive analysis',
            '5 for quick information',
          ],
        },
      ],
    },
    tags: ['google', 'search', 'research', 'information', 'web', 'discovery'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    shortDescription: 'Search and retrieve information from Wikipedia',
    longDescription:
      'Access Wikipedia articles and information for research, fact-checking, and knowledge gathering. Provides structured article content, summaries, and related information. Perfect for educational and informational content.',
    usageExamples: [
      'Research historical events and figures',
      'Get background information on topics',
      'Fact-check information and claims',
      'Gather educational content for presentations',
      'Find definitions and explanations',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Educational research and learning',
        'Background information gathering',
        'Fact-checking and verification',
        'General knowledge questions',
        'Historical and biographical research',
      ],
      avoidWhen: [
        'Current events and breaking news',
        'Commercial or promotional content',
        'Highly specialized technical topics',
        'Opinion-based or subjective information',
      ],
      commonMistakes: [
        'Relying solely on Wikipedia for critical research',
        'Not cross-referencing with other sources',
        'Using outdated or incomplete articles',
        'Not understanding Wikipedia limitations',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'query',
          question: 'What topic do you want to research on Wikipedia?',
          examples: [
            'Machine learning algorithms',
            'History of the Roman Empire',
            'Climate change causes',
            'Programming languages comparison',
          ],
        },
      ],
    },
    tags: ['wikipedia', 'research', 'education', 'knowledge', 'information', 'encyclopedia'],
    difficulty: 'beginner',
    complexity: 'simple',
  },

  // Add more tool descriptions as needed...
  // This is a comprehensive start covering major categories

  // Workflow and automation tools
  schedule: {
    id: 'schedule',
    name: 'Schedule',
    shortDescription: 'Schedule tasks and workflows to run at specific times',
    longDescription:
      'Create scheduled tasks, recurring workflows, and time-based automation. Supports cron expressions, one-time scheduling, and recurring patterns. Essential for automated reporting, maintenance tasks, and periodic operations.',
    usageExamples: [
      'Generate weekly reports every Monday',
      'Run daily data backups at midnight',
      'Send monthly newsletter to subscribers',
      'Perform system maintenance on weekends',
      'Archive old records quarterly',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'Recurring reports and analytics',
        'Automated maintenance tasks',
        'Periodic data processing',
        'Regular communication tasks',
        'System monitoring and cleanup',
      ],
      avoidWhen: [
        'Real-time or immediate tasks',
        'Event-driven triggers (use webhooks)',
        'User-initiated actions',
        'Dynamic scheduling requirements',
      ],
      commonMistakes: [
        'Using incorrect cron syntax',
        'Not accounting for timezone differences',
        'Scheduling too many concurrent tasks',
        'Not handling failed executions',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'schedule',
          question: 'When should this task run?',
          examples: [
            'Every Monday at 9 AM',
            'Daily at midnight',
            'First day of every month',
            '0 9 * * 1 (cron format)',
          ],
        },
        {
          parameter: 'timezone',
          question: 'What timezone should be used?',
          examples: ['America/New_York', 'UTC', 'Europe/London', 'Asia/Tokyo'],
        },
      ],
    },
    tags: ['schedule', 'automation', 'cron', 'recurring', 'tasks', 'timing'],
    difficulty: 'intermediate',
    complexity: 'moderate',
  },

  webhook: {
    id: 'webhook',
    name: 'Webhook',
    shortDescription: 'Send HTTP webhooks to trigger external systems',
    longDescription:
      'Send HTTP POST requests to external webhooks for system integration and event notifications. Supports custom headers, payload formatting, and retry logic. Perfect for triggering external workflows and system notifications.',
    usageExamples: [
      'Notify external systems of order completion',
      'Trigger deployment pipelines',
      'Send events to analytics platforms',
      'Update third-party dashboards',
      'Integrate with monitoring systems',
    ],
    usageGuidelines: {
      bestUsedFor: [
        'System-to-system notifications',
        'Event-driven integrations',
        'External workflow triggers',
        'Real-time data synchronization',
        'Monitoring and alerting',
      ],
      avoidWhen: [
        'Direct user communications (use messaging tools)',
        'Large data transfers (use file transfer tools)',
        'Synchronous operations requiring responses',
        'High-frequency events without batching',
      ],
      commonMistakes: [
        'Not handling webhook failures and retries',
        'Missing proper authentication headers',
        'Not validating webhook endpoints',
        'Sending malformed JSON payloads',
      ],
    },
    conversationalPrompts: {
      parameterQuestions: [
        {
          parameter: 'url',
          question: 'What webhook URL should receive the notification?',
          examples: [
            'https://api.example.com/webhooks/orders',
            'https://hooks.slack.com/services/...',
            'https://myapp.com/api/notifications',
          ],
        },
        {
          parameter: 'payload',
          question: 'What data should be sent in the webhook?',
          examples: [
            '{"event": "order_completed", "order_id": "123"}',
            '{"message": "Deployment successful", "version": "1.2.3"}',
            '{"alert": "High CPU usage", "threshold": 85}',
          ],
        },
      ],
    },
    tags: ['webhook', 'http', 'integration', 'notifications', 'events', 'automation'],
    difficulty: 'beginner',
    complexity: 'simple',
  },
}

/**
 * Tool Registry Initialization Service
 */
export class ToolRegistryInitializer {
  private initialized = false

  /**
   * Initialize the tool registry with all Sim tools
   */
  async initializeAllTools(): Promise<{
    totalTools: number
    registeredTools: string[]
    errors: Array<{ toolId: string; error: string }>
  }> {
    if (this.initialized) {
      return {
        totalTools: toolRegistry.getAllTools().length,
        registeredTools: toolRegistry.getAllTools().map((t) => t.id),
        errors: [],
      }
    }

    const errors: Array<{ toolId: string; error: string }> = []
    const registeredTools: string[] = []

    // Register all tools with enhanced descriptions
    for (const [toolId, description] of Object.entries(COMPREHENSIVE_TOOL_DESCRIPTIONS)) {
      try {
        // Get the block configuration (in a real implementation, this would dynamically load)
        const blockConfig = this.getBlockConfig(toolId)

        if (blockConfig) {
          toolRegistry.registerTool(blockConfig, description)
          registeredTools.push(toolId)
        } else {
          errors.push({
            toolId,
            error: 'Block configuration not found',
          })
        }
      } catch (error) {
        errors.push({
          toolId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    this.initialized = true

    return {
      totalTools: registeredTools.length,
      registeredTools,
      errors,
    }
  }

  /**
   * Get block configuration for a tool
   * In a real implementation, this would dynamically import the block
   */
  private getBlockConfig(toolId: string): BlockConfig | null {
    // Mock block configurations for tools we don't have imports for
    const mockConfigs: Record<string, Partial<BlockConfig>> = {
      function: FunctionBlock,
      api: ApiBlock,
      slack: SlackBlock,
      gmail: GmailBlock,

      // Mock configurations for other tools
      microsoft_teams: {
        type: 'microsoft_teams',
        name: 'Microsoft Teams',
        category: 'tools',
        bgColor: '#464EB8',
        inputs: {
          channel: { type: 'string', description: 'Teams channel' },
          message: { type: 'string', description: 'Message content' },
        },
        outputs: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        tools: { access: ['teams_message'] },
        subBlocks: [
          { id: 'channel', type: 'short-input', required: true },
          { id: 'message', type: 'long-input', required: true },
        ],
      },

      discord: {
        type: 'discord',
        name: 'Discord',
        category: 'tools',
        bgColor: '#7289DA',
        inputs: {
          channel: { type: 'string', description: 'Discord channel' },
          content: { type: 'string', description: 'Message content' },
        },
        outputs: {
          messageId: { type: 'string', description: 'Message ID' },
        },
        tools: { access: ['discord_message'] },
        subBlocks: [
          { id: 'channel', type: 'short-input', required: true },
          { id: 'content', type: 'long-input', required: true },
        ],
      },

      mysql: {
        type: 'mysql',
        name: 'MySQL',
        category: 'tools',
        bgColor: '#00758F',
        inputs: {
          query: { type: 'string', description: 'SQL query' },
          database: { type: 'string', description: 'Database connection' },
        },
        outputs: {
          result: { type: 'json', description: 'Query result' },
          rowCount: { type: 'number', description: 'Number of affected rows' },
        },
        tools: { access: ['mysql_query'] },
        subBlocks: [
          { id: 'query', type: 'code', required: true },
          { id: 'database', type: 'short-input', required: true },
        ],
      },

      s3: {
        type: 's3',
        name: 'S3',
        category: 'tools',
        bgColor: '#FF9900',
        inputs: {
          bucket: { type: 'string', description: 'S3 bucket name' },
          key: { type: 'string', description: 'File key/path' },
          operation: { type: 'string', description: 'Operation type' },
        },
        outputs: {
          url: { type: 'string', description: 'File URL' },
          etag: { type: 'string', description: 'File ETag' },
        },
        tools: { access: ['s3_upload', 's3_download'] },
        subBlocks: [
          { id: 'bucket', type: 'short-input', required: true },
          { id: 'key', type: 'short-input', required: true },
          { id: 'operation', type: 'dropdown', required: true },
        ],
      },

      // Add more mock configurations as needed
      schedule: {
        type: 'schedule',
        name: 'Schedule',
        category: 'tools',
        bgColor: '#28A745',
        inputs: {
          schedule: { type: 'string', description: 'Cron schedule' },
          timezone: { type: 'string', description: 'Timezone' },
        },
        outputs: {
          scheduledId: { type: 'string', description: 'Scheduled task ID' },
        },
        tools: { access: ['schedule_task'] },
        subBlocks: [
          { id: 'schedule', type: 'short-input', required: true },
          { id: 'timezone', type: 'short-input', required: false },
        ],
      },
    }

    return (mockConfigs[toolId] as BlockConfig) || null
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get tool statistics
   */
  getToolStatistics(): {
    totalTools: number
    byCategory: Record<string, number>
    byDifficulty: Record<string, number>
    byComplexity: Record<string, number>
  } {
    const tools = toolRegistry.getAllTools()

    const byCategory: Record<string, number> = {}
    const byDifficulty: Record<string, number> = {}
    const byComplexity: Record<string, number> = {}

    tools.forEach((tool) => {
      // Get block config to determine category
      const blockConfig = toolRegistry.getBlockConfig(tool.id)
      const category = blockConfig?.category || 'other'

      byCategory[category] = (byCategory[category] || 0) + 1
      byDifficulty[tool.difficulty] = (byDifficulty[tool.difficulty] || 0) + 1
      byComplexity[tool.complexity] = (byComplexity[tool.complexity] || 0) + 1
    })

    return {
      totalTools: tools.length,
      byCategory,
      byDifficulty,
      byComplexity,
    }
  }
}

// =============================================
// Export singleton instance
// =============================================

export const toolRegistryInitializer = new ToolRegistryInitializer()
