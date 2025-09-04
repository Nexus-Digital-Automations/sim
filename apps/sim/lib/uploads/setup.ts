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
