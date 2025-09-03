/**
 * Nexus Tool: Search Knowledge Base
 * Stub implementation for knowledge base search functionality
 */

export const searchKnowledge = {
  description: 'Search through knowledge base documents using semantic search',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      knowledgeBaseId: { type: 'string' },
      workspaceId: { type: 'string' },
      limit: { type: 'number' },
      threshold: { type: 'number' },
    },
    required: ['query'],
  },
}
