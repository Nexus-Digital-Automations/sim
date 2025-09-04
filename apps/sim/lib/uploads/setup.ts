// Client-safe configuration - local storage only
export const UPLOAD_DIR = '/uploads'

// Local storage configuration flags
export const USE_BLOB_STORAGE = false
export const USE_S3_STORAGE = false
export const USE_LOCAL_STORAGE = true

// Local storage directory configuration
export const LOCAL_CONFIG = {
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}

// Azure Blob Storage configuration (for compatibility - not used in local setup)
export const BLOB_EXECUTION_FILES_CONFIG = {
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  containerName: process.env.AZURE_BLOB_CONTAINER || 'execution-files',
}

// S3 Storage configuration (for compatibility - not used in local setup)
export const S3_EXECUTION_FILES_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.S3_BUCKET || 'execution-files',
}

// Azure Blob Storage configuration for Knowledge Base (for compatibility - not used in local setup)
export const BLOB_KB_CONFIG = {
  accountName:
    process.env.AZURE_KB_STORAGE_ACCOUNT_NAME || process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
  accountKey:
    process.env.AZURE_KB_STORAGE_ACCOUNT_KEY || process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
  connectionString:
    process.env.AZURE_KB_STORAGE_CONNECTION_STRING ||
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    '',
  containerName: process.env.AZURE_KB_BLOB_CONTAINER || 'knowledge-base',
}

// S3 Storage configuration for Knowledge Base (for compatibility - not used in local setup)
export const S3_KB_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.S3_KB_BUCKET || 'knowledge-base',
}

// S3 Storage configuration for Copilot (for compatibility - not used in local setup)
export const S3_COPILOT_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.S3_COPILOT_BUCKET || 'copilot-files',
}

/**
 * Get the current storage provider as a human-readable string
 */
export function getStorageProvider(): 'Local' {
  return 'Local'
}

/**
 * Check if we're using any cloud storage (always false for local-only setup)
 */
export function isUsingCloudStorage(): boolean {
  return false
}
