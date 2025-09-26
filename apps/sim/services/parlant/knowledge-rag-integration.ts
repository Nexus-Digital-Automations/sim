/**
 * Knowledge Base RAG Integration - Master Service
 * ===============================================
 *
 * This master service coordinates all Knowledge Base Integration with RAG
 * components, providing a unified interface for Parlant agents to access
 * enhanced knowledge capabilities.
 *
 * Features:
 * - Unified RAG pipeline for agent interactions
 * - Coordinated knowledge retrieval and learning
 * - End-to-end workflow documentation support
 * - Intelligent file processing and integration
 * - Continuous learning and optimization
 */

import { createLogger } from '@/lib/logs/console/logger'
import {
  agentLearningService,
  type LearningInsight,
  type UserInteraction,
} from './agent-learning-service'
import { errorHandler } from './error-handler'
import {
  type BatchUploadRequest,
  type BatchUploadResult,
  type FileUploadRequest,
  type FileUploadResult,
  fileUploadProcessorService,
} from './file-upload-processor'
import {
  knowledgeIntegrationService,
  type ParlantRetrieverConfig,
  type RAGContext,
} from './knowledge-integration'
import type { AuthContext } from './types'
import {
  type WorkflowContext,
  type WorkflowDocumentationQuery,
  type WorkflowHelp,
  workflowDocumentationRAGService,
} from './workflow-documentation-rag'

const logger = createLogger('KnowledgeRAGIntegration')

export interface RAGEnhancedResponse {
  originalQuery: string
  enhancedResponse: string
  ragContext: RAGContext
  confidence: number
  sources: Array<{
    documentName: string
    relevance: number
    excerpt: string
  }>
  processingTime: number
  learningTriggers?: string[]
}

export interface AgentKnowledgeProfile {
  agentId: string
  knowledgeBases: Array<{
    id: string
    name: string
    priority: number
    specializationTags: string[]
  }>
  learningMetrics: {
    totalInteractions: number
    averageRelevance: number
    userSatisfactionScore: number
    improvementTrend: number
  }
  optimizationStatus: {
    lastOptimized: Date
    pendingOptimizations: number
    performanceGains: Record<string, number>
  }
}

export interface KnowledgeRAGConfig {
  agentId: string
  knowledgeBases: string[]
  ragSettings: {
    topK: number
    similarityThreshold: number
    maxContextLength: number
    enableLearning: boolean
  }
  workflowContext?: WorkflowContext
  userContext?: {
    userId: string
    workspaceId: string
    experienceLevel: 'beginner' | 'intermediate' | 'expert'
  }
}

/**
 * Master Knowledge RAG Integration Service
 * Coordinates all RAG components for comprehensive knowledge integration
 */
export class KnowledgeRAGIntegrationService {
  /**
   * Process a user query with full RAG enhancement
   */
  async processRAGQuery(
    query: string,
    config: KnowledgeRAGConfig,
    auth: AuthContext,
    sessionId?: string
  ): Promise<RAGEnhancedResponse> {
    const startTime = Date.now()

    try {
      logger.info('Processing RAG-enhanced query', {
        query: `${query.substring(0, 100)}...`,
        agentId: config.agentId,
        knowledgeBasesCount: config.knowledgeBases.length,
        userId: auth.user_id,
      })

      // 1. Retrieve relevant context from knowledge bases
      const ragContexts: RAGContext[] = []

      for (const knowledgeBaseId of config.knowledgeBases) {
        try {
          const retrieverConfig: ParlantRetrieverConfig = {
            knowledgeBaseId,
            topK: Math.ceil(config.ragSettings.topK / config.knowledgeBases.length),
            similarityThreshold: config.ragSettings.similarityThreshold,
            maxContextLength: Math.ceil(
              config.ragSettings.maxContextLength / config.knowledgeBases.length
            ),
          }

          const context = await knowledgeIntegrationService.retrieveRelevantContext(
            query,
            retrieverConfig,
            auth
          )

          if (context.retrievedChunks.length > 0) {
            ragContexts.push(context)
          }
        } catch (error) {
          logger.warn('Failed to retrieve from knowledge base', { error, knowledgeBaseId })
        }
      }

      // 2. Get workflow-specific help if context is provided
      let workflowHelp: WorkflowHelp[] = []
      if (config.workflowContext) {
        try {
          const workflowQuery: WorkflowDocumentationQuery = {
            query,
            workflowContext: config.workflowContext,
            includeExamples: true,
            maxResults: 2,
          }

          workflowHelp = await workflowDocumentationRAGService.getWorkflowHelp(workflowQuery, auth)
        } catch (error) {
          logger.warn('Failed to get workflow help', { error })
        }
      }

      // 3. Combine and rank all contexts
      const combinedContext = this.combineRAGContexts(ragContexts, workflowHelp)

      // 4. Generate enhanced response
      const enhancedResponse = this.generateEnhancedResponse(query, combinedContext, workflowHelp)

      // 5. Calculate confidence and extract sources
      const confidence = this.calculateResponseConfidence(combinedContext, workflowHelp)
      const sources = this.extractSources(combinedContext, workflowHelp)

      const processingTime = Date.now() - startTime

      const result: RAGEnhancedResponse = {
        originalQuery: query,
        enhancedResponse,
        ragContext: combinedContext,
        confidence,
        sources,
        processingTime,
        learningTriggers: this.identifyLearningTriggers(combinedContext, confidence),
      }

      // 6. Record interaction for learning if enabled
      if (config.ragSettings.enableLearning && sessionId && config.userContext) {
        const interaction: UserInteraction = {
          sessionId,
          agentId: config.agentId,
          timestamp: new Date(),
          interaction: {
            userQuery: query,
            agentResponse: enhancedResponse,
            ragContext: combinedContext,
            toolsUsed: [],
            responseTime: processingTime,
            conversationTurn: 1,
          },
          context: {
            workspaceId: config.userContext.workspaceId,
            userId: config.userContext.userId,
            userExperience: config.userContext.experienceLevel,
          },
        }

        await agentLearningService.recordInteraction(interaction)
      }

      logger.info('RAG query processing completed', {
        processingTime,
        confidence,
        sourcesCount: sources.length,
        contextChunks: combinedContext.retrievedChunks.length,
      })

      return result
    } catch (error) {
      logger.error('RAG query processing failed', { error, query, config })
      throw errorHandler.handleError(error, 'process_rag_query')
    }
  }

  /**
   * Get agent knowledge profile with learning insights
   */
  async getAgentKnowledgeProfile(
    agentId: string,
    auth: AuthContext,
    timeRange?: { start: Date; end: Date }
  ): Promise<AgentKnowledgeProfile> {
    try {
      logger.info('Retrieving agent knowledge profile', { agentId })

      // Get available knowledge bases
      const knowledgeBases = await knowledgeIntegrationService.getAvailableKnowledgeBases(
        auth.workspace_id || '',
        auth
      )

      // Get learning metrics
      const period = timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      }

      const learningMetrics = await agentLearningService.getLearningMetrics(agentId, period, auth)

      const profile: AgentKnowledgeProfile = {
        agentId,
        knowledgeBases: knowledgeBases.map((kb) => ({
          id: kb.id,
          name: kb.name,
          priority: 1,
          specializationTags: [],
        })),
        learningMetrics: {
          totalInteractions: learningMetrics.metrics.totalInteractions,
          averageRelevance: learningMetrics.metrics.knowledgeHitRate,
          userSatisfactionScore: learningMetrics.metrics.userSatisfaction,
          improvementTrend: learningMetrics.metrics.improvementTrend,
        },
        optimizationStatus: {
          lastOptimized: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          pendingOptimizations: Object.keys(learningMetrics.learningProgress.performanceGains)
            .length,
          performanceGains: learningMetrics.learningProgress.performanceGains,
        },
      }

      logger.info('Agent knowledge profile retrieved', {
        agentId,
        knowledgeBasesCount: profile.knowledgeBases.length,
        totalInteractions: profile.learningMetrics.totalInteractions,
      })

      return profile
    } catch (error) {
      logger.error('Failed to get agent knowledge profile', { error, agentId })
      throw errorHandler.handleError(error, 'get_agent_knowledge_profile')
    }
  }

  /**
   * Process file upload with full RAG integration
   */
  async processKnowledgeFileUpload(
    request: FileUploadRequest,
    auth: AuthContext,
    onProgress?: (result: FileUploadResult) => void
  ): Promise<FileUploadResult> {
    try {
      logger.info('Processing knowledge file upload', {
        fileName: request.file.name,
        knowledgeBaseId: request.knowledgeBaseId,
        hasAgentContext: !!request.agentContext,
      })

      // Set RAG optimization by default
      const enhancedRequest: FileUploadRequest = {
        ...request,
        processingOptions: {
          ...request.processingOptions,
          enableRAGOptimization: true,
          extractMetadata: true,
          generateTags: true,
        },
      }

      const result = await fileUploadProcessorService.processFileUpload(
        enhancedRequest,
        auth,
        onProgress
      )

      logger.info('Knowledge file upload completed', {
        uploadId: result.uploadId,
        documentId: result.documentId,
        status: result.status,
      })

      return result
    } catch (error) {
      logger.error('Knowledge file upload failed', { error, request })
      throw errorHandler.handleError(error, 'process_knowledge_file_upload')
    }
  }

  /**
   * Generate learning insights for knowledge optimization
   */
  async generateKnowledgeOptimizations(
    agentId: string,
    timeRange: { start: Date; end: Date },
    auth: AuthContext
  ): Promise<{
    insights: LearningInsight[]
    optimizations: any[]
    recommendations: Array<{
      category: string
      priority: 'low' | 'medium' | 'high'
      description: string
      expectedImpact: number
    }>
  }> {
    try {
      logger.info('Generating knowledge optimizations', { agentId, timeRange })

      // Get learning insights
      const insights = await agentLearningService.generateLearningInsights(agentId, timeRange, auth)

      // Get available knowledge bases for optimization
      const knowledgeBases = await knowledgeIntegrationService.getAvailableKnowledgeBases(
        auth.workspace_id || '',
        auth
      )

      // Generate optimizations for each knowledge base
      const optimizations: any[] = []
      for (const kb of knowledgeBases) {
        const kbOptimizations = await knowledgeIntegrationService.optimizeKnowledgeBase(
          kb.id,
          insights,
          auth
        )
        optimizations.push(...kbOptimizations)
      }

      // Generate high-level recommendations
      const recommendations = this.generateOptimizationRecommendations(insights)

      logger.info('Knowledge optimizations generated', {
        insightsCount: insights.length,
        optimizationsCount: optimizations.length,
        recommendationsCount: recommendations.length,
      })

      return {
        insights,
        optimizations,
        recommendations,
      }
    } catch (error) {
      logger.error('Failed to generate knowledge optimizations', { error, agentId })
      throw errorHandler.handleError(error, 'generate_knowledge_optimizations')
    }
  }

  /**
   * Combine multiple RAG contexts into a unified context
   */
  private combineRAGContexts(ragContexts: RAGContext[], workflowHelp: WorkflowHelp[]): RAGContext {
    const allChunks = ragContexts.flatMap((context) => context.retrievedChunks)
    const allKnowledgeBaseIds = [
      ...new Set(ragContexts.flatMap((context) => context.knowledgeBaseIds)),
    ]

    // Sort chunks by similarity score
    allChunks.sort((a, b) => b.similarity - a.similarity)

    // Take top chunks within context length limit
    const maxContextLength = 4000
    let currentLength = 0
    const selectedChunks = []

    for (const chunk of allChunks) {
      if (currentLength + chunk.content.length <= maxContextLength) {
        selectedChunks.push(chunk)
        currentLength += chunk.content.length
      }
    }

    // Add workflow help content as synthetic chunks
    workflowHelp.forEach((help, index) => {
      if (currentLength + help.content.length <= maxContextLength) {
        selectedChunks.push({
          documentId: `workflow_help_${index}`,
          documentName: help.title,
          content: help.content,
          chunkIndex: 0,
          similarity: help.confidence,
          metadata: { helpType: help.helpType },
        })
        currentLength += help.content.length
      }
    })

    const averageRetrievalScore =
      selectedChunks.length > 0
        ? selectedChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / selectedChunks.length
        : 0

    return {
      query: ragContexts[0]?.query || '',
      retrievedChunks: selectedChunks,
      knowledgeBaseIds: allKnowledgeBaseIds,
      totalResults: allChunks.length,
      retrievalScore: averageRetrievalScore,
      contextLength: currentLength,
    }
  }

  /**
   * Generate enhanced response using RAG context and workflow help
   */
  private generateEnhancedResponse(
    query: string,
    ragContext: RAGContext,
    workflowHelp: WorkflowHelp[]
  ): string {
    if (ragContext.retrievedChunks.length === 0 && workflowHelp.length === 0) {
      return `I don't have specific information about "${query}" in the knowledge base. Please provide more context or check if the relevant documentation is available.`
    }

    let response = `Based on the available knowledge and documentation:\n\n`

    // Add workflow-specific help first
    workflowHelp.forEach((help) => {
      if (help.confidence > 0.6) {
        response += `**${help.title}:**\n${help.content}\n\n`

        if (help.examples && help.examples.length > 0) {
          response += `**Examples:**\n`
          help.examples.forEach((example) => {
            response += `- ${example.title}: ${example.description}\n`
          })
          response += '\n'
        }
      }
    })

    // Add knowledge base content
    if (ragContext.retrievedChunks.length > 0) {
      response += `**Relevant Information:**\n`

      ragContext.retrievedChunks
        .filter((chunk) => chunk.similarity > 0.6)
        .slice(0, 3)
        .forEach((chunk, index) => {
          response += `${index + 1}. From ${chunk.documentName}:\n${chunk.content}\n\n`
        })
    }

    // Add confidence indicator
    if (ragContext.retrievalScore < 0.5) {
      response += `*Note: The confidence in this response is moderate. You may want to consult additional sources or provide more specific details.*`
    }

    return response
  }

  /**
   * Calculate response confidence based on context quality
   */
  private calculateResponseConfidence(
    ragContext: RAGContext,
    workflowHelp: WorkflowHelp[]
  ): number {
    let confidence = 0

    // RAG context contribution
    if (ragContext.retrievedChunks.length > 0) {
      confidence += Math.min(0.6, ragContext.retrievalScore * 0.6)
    }

    // Workflow help contribution
    if (workflowHelp.length > 0) {
      const workflowConfidence =
        workflowHelp.reduce((sum, help) => sum + help.confidence, 0) / workflowHelp.length
      confidence += Math.min(0.4, workflowConfidence * 0.4)
    }

    return Math.min(1.0, confidence)
  }

  /**
   * Extract sources from combined context
   */
  private extractSources(ragContext: RAGContext, workflowHelp: WorkflowHelp[]) {
    const sources = []

    // Add RAG sources
    ragContext.retrievedChunks.forEach((chunk) => {
      sources.push({
        documentName: chunk.documentName,
        relevance: chunk.similarity,
        excerpt: `${chunk.content.substring(0, 200)}...`,
      })
    })

    // Add workflow help sources
    workflowHelp.forEach((help) => {
      help.sources?.forEach((source) => {
        sources.push({
          documentName: source.documentName,
          relevance: source.similarity,
          excerpt: `${help.content.substring(0, 200)}...`,
        })
      })
    })

    return sources.slice(0, 5) // Limit to top 5 sources
  }

  /**
   * Identify learning triggers based on response quality
   */
  private identifyLearningTriggers(ragContext: RAGContext, confidence: number): string[] {
    const triggers: string[] = []

    if (confidence < 0.5) {
      triggers.push('low_confidence_response')
    }

    if (ragContext.retrievedChunks.length === 0) {
      triggers.push('no_relevant_context')
    }

    if (ragContext.retrievalScore < 0.6) {
      triggers.push('poor_retrieval_quality')
    }

    if (ragContext.contextLength < 200) {
      triggers.push('insufficient_context')
    }

    return triggers
  }

  /**
   * Generate optimization recommendations from learning insights
   */
  private generateOptimizationRecommendations(insights: LearningInsight[]) {
    const recommendations: Array<{
      category: string
      priority: 'low' | 'medium' | 'high'
      description: string
      expectedImpact: number
    }> = []

    insights.forEach((insight) => {
      insight.recommendations.forEach((rec) => {
        recommendations.push({
          category: insight.type,
          priority: rec.priority,
          description: rec.action,
          expectedImpact: rec.expectedImpact,
        })
      })
    })

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }
}

/**
 * Singleton instance of the Knowledge RAG Integration Service
 */
export const knowledgeRAGIntegrationService = new KnowledgeRAGIntegrationService()

/**
 * Convenience functions for common RAG operations
 */
export const ragOperations = {
  /**
   * Quick RAG query for simple use cases
   */
  async quickQuery(
    query: string,
    agentId: string,
    knowledgeBaseIds: string[],
    auth: AuthContext
  ): Promise<{ response: string; confidence: number }> {
    const config: KnowledgeRAGConfig = {
      agentId,
      knowledgeBases: knowledgeBaseIds,
      ragSettings: {
        topK: 5,
        similarityThreshold: 0.7,
        maxContextLength: 2000,
        enableLearning: false,
      },
    }

    const result = await knowledgeRAGIntegrationService.processRAGQuery(query, config, auth)

    return {
      response: result.enhancedResponse,
      confidence: result.confidence,
    }
  },

  /**
   * Get workflow help for a specific query
   */
  async getWorkflowHelp(
    query: string,
    workflowContext: WorkflowContext,
    auth: AuthContext
  ): Promise<WorkflowHelp[]> {
    const workflowQuery: WorkflowDocumentationQuery = {
      query,
      workflowContext,
      includeExamples: true,
      maxResults: 3,
    }

    return await workflowDocumentationRAGService.getWorkflowHelp(workflowQuery, auth)
  },

  /**
   * Upload and process multiple files
   */
  async bulkUpload(
    files: Array<{ name: string; content: string | Buffer; mimeType: string; size: number }>,
    knowledgeBaseId: string,
    auth: AuthContext
  ): Promise<BatchUploadResult> {
    const requests: FileUploadRequest[] = files.map((file) => ({
      file,
      knowledgeBaseId,
      processingOptions: {
        enableRAGOptimization: true,
        extractMetadata: true,
        generateTags: true,
      },
    }))

    const batchRequest: BatchUploadRequest = {
      files: requests,
      batchOptions: {
        parallel: true,
        maxConcurrency: 3,
      },
    }

    return await fileUploadProcessorService.processBatchUpload(batchRequest, auth)
  },
}

/**
 * Default export for convenience
 */
export default knowledgeRAGIntegrationService
