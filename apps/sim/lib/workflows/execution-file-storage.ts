/**
 * Local storage client for workflow execution files
 * Directory structure: uploads/workspace_id/workflow_id/execution_id/filename
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('ExecutionFileStorage')

// Local storage directory for execution files
const EXECUTION_FILES_DIR =
  process.env.EXECUTION_FILES_DIR || path.join(process.cwd(), 'uploads', 'execution-files')

// Ensure directory exists
if (!fs.existsSync(EXECUTION_FILES_DIR)) {
  fs.mkdirSync(EXECUTION_FILES_DIR, { recursive: true })
}

export interface ExecutionFileInfo {
  key: string
  path: string
  name: string
  size: number
  type: string
  executionId: string
  workflowId: string
  workspaceId: string
}

/**
 * Upload a file for workflow execution
 */
export async function uploadExecutionFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  executionId: string,
  workflowId: string,
  workspaceId: string
): Promise<ExecutionFileInfo> {
  const fileExt = path.extname(fileName)
  const baseName = path.basename(fileName, fileExt)
  const uniqueId = uuidv4()
  const key = `${workspaceId}/${workflowId}/${executionId}/${baseName}-${uniqueId}${fileExt}`
  const filePath = path.join(EXECUTION_FILES_DIR, key)

  // Ensure directory exists
  const dir = path.dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })

  // Write file
  await fs.promises.writeFile(filePath, file)

  logger.info(`Execution file uploaded: ${filePath}`)

  return {
    key,
    path: filePath,
    name: fileName,
    size: file.length,
    type: contentType,
    executionId,
    workflowId,
    workspaceId,
  }
}

/**
 * Download a file from execution storage
 */
export async function downloadExecutionFile(key: string): Promise<Buffer> {
  const filePath = path.join(EXECUTION_FILES_DIR, key)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Execution file not found: ${key}`)
  }

  logger.info(`Downloading execution file: ${filePath}`)
  return fs.promises.readFile(filePath)
}

/**
 * Delete a file from execution storage
 */
export async function deleteExecutionFile(key: string): Promise<void> {
  const filePath = path.join(EXECUTION_FILES_DIR, key)

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath)
    logger.info(`Execution file deleted: ${filePath}`)
  }
}

/**
 * Get a local URL for an execution file
 */
export async function getExecutionFileUrl(key: string): Promise<string> {
  return `/api/files/execution/${encodeURIComponent(key)}`
}

/**
 * Generate a download URL for an execution file
 */
export async function generateExecutionFileDownloadUrl(
  executionId: string,
  fileId: string
): Promise<string> {
  return `/api/files/execution/${encodeURIComponent(executionId)}/${encodeURIComponent(fileId)}`
}

/**
 * Clean up execution files for a specific execution
 */
export async function cleanupExecutionFiles(
  executionId: string,
  workflowId: string,
  workspaceId: string
): Promise<number> {
  const executionDir = path.join(EXECUTION_FILES_DIR, workspaceId, workflowId, executionId)

  if (!fs.existsSync(executionDir)) {
    return 0
  }

  try {
    const files = await fs.promises.readdir(executionDir)
    for (const file of files) {
      await fs.promises.unlink(path.join(executionDir, file))
    }
    await fs.promises.rmdir(executionDir)

    logger.info(`Cleaned up execution files for ${executionId}`)
    return files.length
  } catch (error) {
    logger.error(`Failed to cleanup execution files for ${executionId}:`, error)
    return 0
  }
}
