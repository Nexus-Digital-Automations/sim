import * as fs from 'node:fs'
import * as path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('StorageClient')

// Client-safe type definitions
export type FileInfo = {
  path: string
  key: string
  name: string
  size: number
  type: string
}

export type CustomStorageConfig = {
  // Local storage config
  baseDir?: string
}

// Local storage directory
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

/**
 * Upload a file to local storage
 * @param file Buffer containing file data
 * @param fileName Original file name
 * @param contentType MIME type of the file
 * @param size File size in bytes (optional, will use buffer length if not provided)
 * @returns Object with file information
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  size?: number
): Promise<FileInfo>

/**
 * Upload a file to local storage with custom configuration
 * @param file Buffer containing file data
 * @param fileName Original file name
 * @param contentType MIME type of the file
 * @param customConfig Custom storage configuration
 * @param size File size in bytes (optional, will use buffer length if not provided)
 * @returns Object with file information
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  customConfig: CustomStorageConfig,
  size?: number
): Promise<FileInfo>

export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string,
  configOrSize?: CustomStorageConfig | number,
  size?: number
): Promise<FileInfo> {
  const actualSize = size || (typeof configOrSize === 'number' ? configOrSize : file.length)
  const baseDir =
    typeof configOrSize === 'object' ? configOrSize.baseDir || UPLOADS_DIR : UPLOADS_DIR

  // Generate unique filename to avoid conflicts
  const fileExt = path.extname(fileName)
  const baseName = path.basename(fileName, fileExt)
  const uniqueId = uuidv4()
  const key = `${baseName}-${uniqueId}${fileExt}`
  const filePath = path.join(baseDir, key)

  // Ensure directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Write file to local storage
  await fs.promises.writeFile(filePath, file)

  logger.info(`File uploaded to local storage: ${filePath}`)

  return {
    path: filePath,
    key,
    name: fileName,
    size: actualSize,
    type: contentType,
  }
}

/**
 * Download a file from local storage
 * @param key File key/name
 * @returns File buffer
 */
export async function downloadFile(key: string): Promise<Buffer>

/**
 * Download a file from local storage with custom configuration
 * @param key File key/name
 * @param customConfig Custom storage configuration
 * @returns File buffer
 */
export async function downloadFile(key: string, customConfig: CustomStorageConfig): Promise<Buffer>

export async function downloadFile(
  key: string,
  customConfig?: CustomStorageConfig
): Promise<Buffer> {
  const baseDir = customConfig?.baseDir || UPLOADS_DIR
  const filePath = path.join(baseDir, key)

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${key}`)
  }

  logger.info(`Downloading file from local storage: ${filePath}`)
  return fs.promises.readFile(filePath)
}

/**
 * Delete a file from local storage
 * @param key File key/name
 */
export async function deleteFile(key: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, key)

  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath)
    logger.info(`File deleted from local storage: ${filePath}`)
  }
}

/**
 * Generate a local file URL for direct file access
 * @param key File key/name
 * @param expiresIn Time in seconds until URL expires (unused for local storage)
 * @returns Local file URL
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  logger.info(`Generating local file URL: ${key}`)
  return `/api/files/serve/${key}`
}

/**
 * Generate a local file URL for direct file access with custom configuration
 * @param key File key/name
 * @param customConfig Custom storage configuration
 * @param expiresIn Time in seconds until URL expires (unused for local storage)
 * @returns Local file URL
 */
export async function getPresignedUrlWithConfig(
  key: string,
  customConfig: CustomStorageConfig,
  expiresIn = 3600
): Promise<string> {
  logger.info(`Generating local file URL with custom config: ${key}`)
  return `/api/files/serve/${key}`
}

/**
 * Get the current storage provider name
 */
export function getStorageProvider(): 'local' {
  return 'local'
}

/**
 * Check if we're using cloud storage (always false for local storage)
 */
export function isUsingCloudStorage(): boolean {
  return false
}

/**
 * Get the appropriate serve path prefix for local storage
 */
export function getServePathPrefix(): string {
  return '/api/files/serve/'
}
