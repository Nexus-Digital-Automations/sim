/**
 * Workflow Documentation RAG Service
 * ===================================
 *
 * This service provides intelligent documentation and help for Sim workflows
 * using RAG (Retrieval-Augmented Generation) capabilities. It combines
 * workflow metadata with knowledge base content to provide contextual,
 * relevant assistance to users working with workflows.
 *
 * Features:
 * - Contextual workflow help and documentation
 * - Block-specific guidance and examples
 * - Workflow troubleshooting and optimization suggestions
 * - Integration patterns and best practices
 * - Real-time help during workflow creation and editing
 */

import { createLogger } from '@/lib/logs/console/logger'
import { errorHandler } from './error-handler'
import {
  knowledgeIntegrationService,
  type ParlantRetrieverConfig,
  type RAGContext,
} from './knowledge-integration'
import type { AuthContext } from './types'

const logger = createLogger('WorkflowDocumentationRAG')

export interface WorkflowContext {
  workflowId?: string
  blockTypes: string[]
  connectionTypes?: string[]
  currentBlock?: {
    id: string
    type: string
    config?: Record<string, any>
  }
  workflowMeta?: {
    name: string
    description?: string
    category?: string
    tags?: string[]
  }
}

export interface WorkflowHelp {
  helpType: 'general' | 'block_specific' | 'troubleshooting' | 'optimization' | 'integration'
  title: string
  content: string
  examples?: Array<{
    title: string
    description: string
    code?: string
    configuration?: Record<string, any>
  }>
  relatedTopics?: string[]
  confidence: number
  sources: Array<{
    documentName: string
    chunkIndex: number
    similarity: number
  }>
}

export interface WorkflowDocumentationQuery {
  query: string
  workflowContext: WorkflowContext
  helpType?: WorkflowHelp['helpType']
  includeExamples?: boolean
  maxResults?: number
}

/**
 * Workflow Documentation RAG Service
 * Provides intelligent, contextual documentation for Sim workflows
 */
export class WorkflowDocumentationRAGService {
  private readonly DOCUMENTATION_KB_ID = 'workflow_documentation_kb'
  private readonly EXAMPLES_KB_ID = 'workflow_examples_kb'

  /**
   * Get contextual help for a workflow question
   */
  async getWorkflowHelp(
    query: WorkflowDocumentationQuery,
    auth: AuthContext
  ): Promise<WorkflowHelp[]> {
    try {
      logger.info('Processing workflow help request', {
        query: `${query.query.substring(0, 100)}...`,
        workflowId: query.workflowContext.workflowId,
        blockTypes: query.workflowContext.blockTypes,
        helpType: query.helpType,
        userId: auth.user_id,
      })

      // Enhance query with workflow context
      const enhancedQuery = this.enhanceQueryWithContext(query.query, query.workflowContext)

      // Prepare retriever configurations for different knowledge bases
      const retrieverConfigs: Array<{ config: ParlantRetrieverConfig; purpose: string }> = []

      // Main documentation retrieval
      retrieverConfigs.push({
        config: {
          knowledgeBaseId: this.DOCUMENTATION_KB_ID,
          topK: 3,
          similarityThreshold: 0.6,
          tagFilters: this.generateDocumentationTagFilters(query),
        },
        purpose: 'documentation',
      })

      // Examples retrieval if requested
      if (query.includeExamples) {
        retrieverConfigs.push({
          config: {
            knowledgeBaseId: this.EXAMPLES_KB_ID,
            topK: 2,
            similarityThreshold: 0.7,
            tagFilters: this.generateExampleTagFilters(query),
          },
          purpose: 'examples',
        })
      }

      // Perform parallel retrieval
      const retrievalPromises = retrieverConfigs.map(async ({ config, purpose }) => {
        try {
          const ragContext = await knowledgeIntegrationService.retrieveRelevantContext(
            enhancedQuery,
            config,
            auth
          )
          return { ragContext, purpose }
        } catch (error) {
          logger.warn(`Failed to retrieve ${purpose} context`, { error, config })
          return { ragContext: null, purpose }
        }
      })

      const retrievalResults = await Promise.all(retrievalPromises)

      // Combine and process results
      const helpResults: WorkflowHelp[] = []

      for (const { ragContext, purpose } of retrievalResults) {
        if (!ragContext || ragContext.retrievedChunks.length === 0) continue

        const help = this.processRAGContextIntoHelp(
          query,
          ragContext,
          purpose as 'documentation' | 'examples'
        )

        if (help) {
          helpResults.push(help)
        }
      }

      // If no specific results, provide general workflow help
      if (helpResults.length === 0) {
        helpResults.push(this.generateFallbackHelp(query))
      }

      // Sort by confidence and relevance
      helpResults.sort((a, b) => b.confidence - a.confidence)

      logger.info('Workflow help generated', {
        resultCount: helpResults.length,
        averageConfidence:
          helpResults.reduce((sum, h) => sum + h.confidence, 0) / helpResults.length,
        query: query.query,
      })

      return helpResults.slice(0, query.maxResults || 3)
    } catch (error) {
      logger.error('Failed to generate workflow help', { error, query })
      throw errorHandler.handleError(error, 'get_workflow_help')
    }
  }

  /**
   * Get block-specific documentation and examples
   */
  async getBlockHelp(
    blockType: string,
    blockConfig: Record<string, any>,
    issue?: string,
    auth?: AuthContext
  ): Promise<WorkflowHelp> {
    try {
      logger.info('Getting block-specific help', { blockType, issue })

      const query = issue
        ? `How to resolve ${issue} with ${blockType} block?`
        : `How to configure and use ${blockType} block?`

      const workflowContext: WorkflowContext = {
        blockTypes: [blockType],
        currentBlock: {
          id: 'current',
          type: blockType,
          config: blockConfig,
        },
      }

      const helpQuery: WorkflowDocumentationQuery = {
        query,
        workflowContext,
        helpType: 'block_specific',
        includeExamples: true,
        maxResults: 1,
      }

      const authContext = auth || {
        user_id: 'system',
        workspace_id: undefined,
        key_type: 'personal' as const,
      }

      const helpResults = await this.getWorkflowHelp(helpQuery, authContext)

      return helpResults[0] || this.generateFallbackBlockHelp(blockType)
    } catch (error) {
      logger.error('Failed to get block help', { error, blockType })
      return this.generateFallbackBlockHelp(blockType)
    }
  }

  /**
   * Get workflow optimization suggestions
   */
  async getOptimizationSuggestions(
    workflowContext: WorkflowContext,
    performanceMetrics?: {
      executionTime?: number
      errorRate?: number
      throughput?: number
    },
    auth?: AuthContext
  ): Promise<WorkflowHelp[]> {
    try {
      logger.info('Getting optimization suggestions', {
        workflowId: workflowContext.workflowId,
        blockCount: workflowContext.blockTypes.length,
        metrics: performanceMetrics,
      })

      const issues: string[] = []

      if (performanceMetrics?.executionTime && performanceMetrics.executionTime > 30000) {
        issues.push('slow execution time')
      }

      if (performanceMetrics?.errorRate && performanceMetrics.errorRate > 0.1) {
        issues.push('high error rate')
      }

      if (workflowContext.blockTypes.length > 20) {
        issues.push('complex workflow with many blocks')
      }

      const query =
        issues.length > 0
          ? `How to optimize workflow with ${issues.join(', ')}?`
          : `How to optimize workflow with ${workflowContext.blockTypes.join(', ')} blocks?`

      const helpQuery: WorkflowDocumentationQuery = {
        query,
        workflowContext,
        helpType: 'optimization',
        includeExamples: true,
        maxResults: 3,
      }

      const authContext = auth || {
        user_id: 'system',
        workspace_id: undefined,
        key_type: 'personal' as const,
      }

      return await this.getWorkflowHelp(helpQuery, authContext)
    } catch (error) {
      logger.error('Failed to get optimization suggestions', { error })
      return [this.generateFallbackOptimizationHelp()]
    }
  }

  /**
   * Enhance query with workflow context information
   */
  private enhanceQueryWithContext(query: string, context: WorkflowContext): string {
    const contextParts: string[] = [query]

    if (context.blockTypes.length > 0) {
      contextParts.push(`Block types: ${context.blockTypes.join(', ')}`)
    }

    if (context.currentBlock) {
      contextParts.push(`Current block: ${context.currentBlock.type}`)
    }

    if (context.workflowMeta?.category) {
      contextParts.push(`Category: ${context.workflowMeta.category}`)
    }

    if (context.workflowMeta?.tags?.length) {
      contextParts.push(`Tags: ${context.workflowMeta.tags.join(', ')}`)
    }

    return contextParts.join(' | ')
  }

  /**
   * Generate tag filters for documentation retrieval
   */
  private generateDocumentationTagFilters(query: WorkflowDocumentationQuery) {
    const filters: Array<{ tagName: string; tagValue: string }> = []

    // Add block type filters
    if (query.workflowContext.blockTypes.length > 0) {
      query.workflowContext.blockTypes.forEach((blockType) => {
        filters.push({ tagName: 'block_type', tagValue: blockType })
      })
    }

    // Add help type filter
    if (query.helpType) {
      filters.push({ tagName: 'help_type', tagValue: query.helpType })
    }

    // Add category filter
    if (query.workflowContext.workflowMeta?.category) {
      filters.push({ tagName: 'category', tagValue: query.workflowContext.workflowMeta.category })
    }

    return filters
  }

  /**
   * Generate tag filters for example retrieval
   */
  private generateExampleTagFilters(query: WorkflowDocumentationQuery) {
    const filters: Array<{ tagName: string; tagValue: string }> = []

    // Add block type filters for examples
    if (query.workflowContext.blockTypes.length > 0) {
      query.workflowContext.blockTypes.forEach((blockType) => {
        filters.push({ tagName: 'example_type', tagValue: blockType })
      })
    }

    filters.push({ tagName: 'content_type', tagValue: 'example' })

    return filters
  }

  /**
   * Process RAG context into structured help
   */
  private processRAGContextIntoHelp(
    query: WorkflowDocumentationQuery,
    ragContext: RAGContext,
    purpose: 'documentation' | 'examples'
  ): WorkflowHelp | null {
    if (ragContext.retrievedChunks.length === 0) return null

    const helpType = query.helpType || 'general'
    const confidence = ragContext.retrievalScore

    // Extract examples from retrieved chunks
    const examples = purpose === 'examples' ? this.extractExamples(ragContext) : []

    // Generate title based on context
    const title = this.generateHelpTitle(query, purpose)

    // Combine content from chunks
    const content = ragContext.retrievedChunks.map((chunk) => chunk.content).join('\n\n')

    // Extract related topics
    const relatedTopics = this.extractRelatedTopics(ragContext)

    return {
      helpType,
      title,
      content,
      examples,
      relatedTopics,
      confidence,
      sources: ragContext.retrievedChunks.map((chunk) => ({
        documentName: chunk.documentName,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
      })),
    }
  }

  /**
   * Extract examples from RAG context
   */
  private extractExamples(ragContext: RAGContext) {
    const examples: WorkflowHelp['examples'] = []

    ragContext.retrievedChunks.forEach((chunk) => {
      // Try to extract code blocks or configuration examples
      const codeBlocks = chunk.content.match(/```[\s\S]*?```/g)
      const jsonBlocks = chunk.content.match(/\{[\s\S]*?\}/g)

      if (codeBlocks || jsonBlocks) {
        examples.push({
          title: `Example from ${chunk.documentName}`,
          description: `${chunk.content.substring(0, 200)}...`,
          code: codeBlocks?.[0]?.replace(/```/g, ''),
          configuration: jsonBlocks ? this.tryParseJSON(jsonBlocks[0]) : undefined,
        })
      }
    })

    return examples
  }

  /**
   * Extract related topics from content
   */
  private extractRelatedTopics(ragContext: RAGContext): string[] {
    const topics = new Set<string>()

    ragContext.retrievedChunks.forEach((chunk) => {
      // Extract potential topics from metadata
      if (chunk.metadata?.tags) {
        chunk.metadata.tags.forEach((tag: string) => topics.add(tag))
      }

      // Extract topics from content (simple keyword extraction)
      const keywords = chunk.content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || []
      keywords.slice(0, 3).forEach((keyword) => topics.add(keyword))
    })

    return Array.from(topics).slice(0, 5)
  }

  /**
   * Generate appropriate help title
   */
  private generateHelpTitle(query: WorkflowDocumentationQuery, purpose: string): string {
    const { helpType, workflowContext } = query

    if (helpType === 'block_specific' && workflowContext.currentBlock) {
      return `${workflowContext.currentBlock.type} Block ${purpose === 'examples' ? 'Examples' : 'Documentation'}`
    }

    if (helpType === 'troubleshooting') {
      return 'Troubleshooting Guide'
    }

    if (helpType === 'optimization') {
      return 'Optimization Recommendations'
    }

    return purpose === 'examples' ? 'Workflow Examples' : 'Workflow Documentation'
  }

  /**
   * Generate fallback help when RAG retrieval fails
   */
  private generateFallbackHelp(query: WorkflowDocumentationQuery): WorkflowHelp {
    return {
      helpType: query.helpType || 'general',
      title: 'General Workflow Help',
      content: `I couldn't find specific documentation for your query, but here are some general tips for working with workflows:

1. Start with simple workflows and gradually add complexity
2. Test your workflow with sample data before production use
3. Use descriptive names for your blocks and connections
4. Consider error handling and edge cases
5. Document your workflow's purpose and expected inputs/outputs

For more specific help, try rephrasing your question or check the workflow documentation in your knowledge base.`,
      examples: [],
      relatedTopics: ['workflow-basics', 'best-practices', 'troubleshooting'],
      confidence: 0.3,
      sources: [],
    }
  }

  /**
   * Generate fallback help for specific blocks
   */
  private generateFallbackBlockHelp(blockType: string): WorkflowHelp {
    return {
      helpType: 'block_specific',
      title: `${blockType} Block Help`,
      content: `${blockType} block documentation is not currently available in the knowledge base. Here are some general guidelines:

1. Check the block's configuration options in the editor
2. Ensure all required fields are filled
3. Verify input/output connections are correct
4. Test the block in isolation if possible
5. Check for error messages in the execution logs

Consider adding documentation for this block type to your knowledge base for future reference.`,
      examples: [],
      relatedTopics: [blockType.toLowerCase(), 'block-configuration', 'troubleshooting'],
      confidence: 0.2,
      sources: [],
    }
  }

  /**
   * Generate fallback optimization help
   */
  private generateFallbackOptimizationHelp(): WorkflowHelp {
    return {
      helpType: 'optimization',
      title: 'General Optimization Tips',
      content: `Here are some general workflow optimization strategies:

1. **Reduce Complexity**: Minimize the number of blocks and connections
2. **Parallel Processing**: Use parallel paths where possible
3. **Caching**: Cache expensive operations and API calls
4. **Error Handling**: Add proper error handling to prevent failures
5. **Resource Management**: Optimize memory and CPU usage
6. **Monitoring**: Add logging and monitoring to identify bottlenecks

Consider profiling your workflow to identify specific performance issues.`,
      examples: [],
      relatedTopics: ['performance', 'optimization', 'best-practices', 'monitoring'],
      confidence: 0.4,
      sources: [],
    }
  }

  /**
   * Try to parse JSON safely
   */
  private tryParseJSON(jsonString: string): Record<string, any> | undefined {
    try {
      return JSON.parse(jsonString)
    } catch {
      return undefined
    }
  }
}

/**
 * Singleton instance of the Workflow Documentation RAG Service
 */
export const workflowDocumentationRAGService = new WorkflowDocumentationRAGService()

/**
 * Utility functions for workflow documentation
 */
export const workflowDocUtils = {
  /**
   * Create workflow context from workflow data
   */
  createWorkflowContext(workflowData: any): WorkflowContext {
    return {
      workflowId: workflowData.id,
      blockTypes: workflowData.blocks?.map((block: any) => block.type) || [],
      workflowMeta: {
        name: workflowData.name,
        description: workflowData.description,
        category: workflowData.category,
        tags: workflowData.tags,
      },
    }
  },

  /**
   * Format help content for display
   */
  formatHelpContent(help: WorkflowHelp): string {
    let formatted = `# ${help.title}\n\n${help.content}`

    if (help.examples && help.examples.length > 0) {
      formatted += '\n\n## Examples\n\n'
      help.examples.forEach((example, index) => {
        formatted += `### ${example.title}\n${example.description}\n`
        if (example.code) {
          formatted += `\n\`\`\`\n${example.code}\n\`\`\`\n`
        }
        if (index < help.examples.length - 1) formatted += '\n'
      })
    }

    if (help.relatedTopics && help.relatedTopics.length > 0) {
      formatted += `\n\n**Related Topics:** ${help.relatedTopics.join(', ')}`
    }

    return formatted
  },

  /**
   * Check if help content is relevant
   */
  isHelpRelevant(help: WorkflowHelp, minimumConfidence = 0.5): boolean {
    return help.confidence >= minimumConfidence && help.sources.length > 0
  },
}
