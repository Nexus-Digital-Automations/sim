/**
 * Nexus Tool: File Management
 * Stub implementation for file operations
 */

export const manageFiles = {
  description: 'Upload, download, list, or delete files in the workspace',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'upload', 'download', 'delete', 'get-info'] },
      workspaceId: { type: 'string' },
      path: { type: 'string' },
      content: { type: 'string' },
      mimeType: { type: 'string' },
    },
    required: ['action', 'workspaceId'],
  },
}
