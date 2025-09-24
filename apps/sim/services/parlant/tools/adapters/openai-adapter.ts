/**
 * OpenAI Tool Adapter
 * ===================
 *
 * Adapter for OpenAI embeddings and AI services
 * Converts Sim's OpenAI block to Parlant-compatible format
 */

import { OpenAIBlock } from '@/blocks/blocks/openai'
import type { BlockConfig } from '@/blocks/types'
import type { ToolResponse } from '@/tools/types'
import {
  type ParlantTool,
  type ToolExecutionContext,
  UniversalToolAdapter,
} from '../adapter-framework'

export class OpenAIAdapter extends UniversalToolAdapter {
  constructor() {
    super(OpenAIBlock)
  }

  protected transformToParlant(blockConfig: BlockConfig): ParlantTool {
    return {
      id: 'openai_embeddings',
      name: 'OpenAI Text Embeddings',
      description: "Generate vector embeddings from text using OpenAI's embedding models",
      longDescription:
        "Convert text into high-dimensional vector representations using OpenAI's state-of-the-art embedding models. Perfect for semantic search, clustering, and similarity analysis.",
      category: 'ai',
      parameters: [
        {
          name: 'text',
          description: 'The text to generate embeddings for',
          type: 'string',
          required: true,
          examples: [
            'The quick brown fox jumps over the lazy dog',
            'Machine learning is a subset of artificial intelligence',
            'Convert this sentence into embeddings',
          ],
        },
        {
          name: 'model',
          description: 'The OpenAI embedding model to use',
          type: 'string',
          required: false,
          default: 'text-embedding-3-small',
          constraints: {
            enum: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
          },
          examples: ['text-embedding-3-small', 'text-embedding-3-large'],
        },
        {
          name: 'api_key',
          description: 'Your OpenAI API key for authentication',
          type: 'string',
          required: true,
          examples: ['sk-...your-openai-api-key'],
        },
      ],
      outputs: [
        {
          name: 'embeddings',
          description: 'The generated vector embeddings as an array of numbers',
          type: 'array',
        },
        {
          name: 'model_used',
          description: 'The embedding model that was actually used',
          type: 'string',
        },
        {
          name: 'token_usage',
          description: 'Information about token consumption and pricing',
          type: 'object',
        },
      ],
      examples: [
        {
          scenario: 'Generate embeddings for a simple sentence',
          input: {
            text: 'Hello world',
            model: 'text-embedding-3-small',
            api_key: 'sk-your-key',
          },
          expectedOutput: 'Returns a vector of 1536 numbers representing the semantic meaning',
        },
        {
          scenario: 'Use the large model for higher quality embeddings',
          input: {
            text: 'Complex technical document content...',
            model: 'text-embedding-3-large',
            api_key: 'sk-your-key',
          },
          expectedOutput: 'Returns a vector of 3072 numbers with higher semantic precision',
        },
      ],
      usageHints: [
        "Use text-embedding-3-small for most applications - it's faster and cheaper",
        'Use text-embedding-3-large for applications requiring highest quality embeddings',
        'Keep input text under 8192 tokens for best performance',
        'Consider batching multiple texts for efficiency',
        'Embeddings are deterministic - same input always produces same output',
      ],
      requiresAuth: {
        type: 'api_key',
        provider: 'openai',
      },
    }
  }

  protected async transformParameters(
    parlantParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<Record<string, any>> {
    return {
      input: parlantParams.text,
      model: parlantParams.model || 'text-embedding-3-small',
      apiKey: parlantParams.api_key,
    }
  }

  protected async executeSimTool(
    simParams: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolResponse> {
    // This would integrate with Sim's actual OpenAI tool execution
    // For now, return a mock response structure
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${simParams.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: simParams.input,
          model: simParams.model,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()

      return {
        success: true,
        output: {
          embeddings: data.data[0].embedding,
          model: data.model,
          usage: data.usage,
        },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
        },
      }
    }
  }

  protected async transformResult(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    if (!simResult.success) {
      throw new Error(simResult.error || 'OpenAI tool execution failed')
    }

    return {
      embeddings: simResult.output.embeddings,
      model_used: simResult.output.model,
      token_usage: {
        prompt_tokens: simResult.output.usage?.prompt_tokens,
        total_tokens: simResult.output.usage?.total_tokens,
      },
      dimensions: simResult.output.embeddings?.length,
      embedding_model: simResult.output.model,
    }
  }

  protected async calculateUsage(
    simResult: ToolResponse,
    context: ToolExecutionContext
  ): Promise<any> {
    return {
      tokensUsed: simResult.output.usage?.total_tokens || 0,
      apiCallsCount: 1,
      computeUnits: 1,
    }
  }
}
